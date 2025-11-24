import { ChatOpenAI } from '@langchain/openai';
import {
    SystemMessage,
    HumanMessage,
    AIMessage,
    ToolMessage,
    BaseMessage,
    AIMessageChunk
} from '@langchain/core/messages';
import { ObjectId } from 'mongodb';
import { ReminderTools } from './tools/ReminderTools';
import { ReminderRepository } from '../repositories/ReminderRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { Conversation } from '../models/Conversation';
import ConfigManager from '../config/Config';
import Logger from '../utils/Logger';

export interface AgentResponse {
    response: string;
    conversationId: ObjectId;
}

export class AgentService {
    private llm: ChatOpenAI;
    private reminderRepository: ReminderRepository;
    private conversationRepository: ConversationRepository;

    constructor(
        reminderRepository: ReminderRepository,
        conversationRepository: ConversationRepository
    ) {
        const config = ConfigManager.get();

        this.llm = new ChatOpenAI({
            modelName: config.openaiModel,
            // temperature: 0.7,
            openAIApiKey: config.openaiApiKey,
            streaming: true,
        });

        this.reminderRepository = reminderRepository;
        this.conversationRepository = conversationRepository;

        Logger.info(`AgentService initialized with model: ${config.openaiModel}`);
    }

    private getSystemMessage(): SystemMessage {
        return new SystemMessage(`You are a helpful AI assistant that helps users manage their reminders via SMS and web chat.

Your capabilities:
- Create reminders with natural language date/time parsing
- List existing reminders
- Update reminder details
- Delete (cancel) reminders

Important instructions:
1. When users mention dates/times in natural language (e.g., "tomorrow at 3pm", "next Friday", "in 2 hours"), you MUST convert them to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) before calling the create_reminder or update_reminder tools.
2. Always use the current date/time as context for parsing relative dates. Today is ${new Date().toISOString()}.
3. Be conversational and friendly in your responses.
4. Confirm reminder creation with the scheduled date/time in a human-readable format.
5. If a user's request is ambiguous, ask clarifying questions.
6. Always ensure reminder dates are in the future.

Examples of date parsing:
- "tomorrow at 3pm" → Calculate tomorrow's date at 15:00 in ISO format
- "next Friday at 10am" → Calculate next Friday's date at 10:00 in ISO format
- "in 2 hours" → Add 2 hours to current time in ISO format
- "December 25th at noon" → Convert to ISO format with year, month 12, day 25, time 12:00

Remember: You have access to tools to manage reminders. Use them when appropriate!`);
    }

    /**
     * Process a user message and stream the response
     */
    public async processMessageStream(
        userId: ObjectId,
        phoneNumber: string,
        message: string,
        conversationId: ObjectId | undefined,
        onEvent: (event: any) => void
    ): Promise<void> {
        try {
            Logger.info(`Processing message stream for user ${userId.toString()}`);

            // Get or create conversation
            let conversation: Conversation;
            if (conversationId) {
                const existing = await this.conversationRepository.findById(conversationId);
                if (!existing) {
                    throw new Error('Conversation not found');
                }
                conversation = existing;
            } else {
                conversation = await this.conversationRepository.getOrCreateForUser(
                    userId,
                    phoneNumber
                );
            }

            // Send conversation ID immediately
            onEvent({ type: 'conversation_id', data: conversation._id!.toString() });

            // Add user message to conversation
            await this.conversationRepository.appendMessage(
                conversation._id!,
                'user',
                message
            );

            // Prepare tools
            const reminderTools = new ReminderTools(this.reminderRepository);
            const tools = reminderTools.getAllTools(userId, conversation._id!, phoneNumber);
            const llmWithTools = this.llm.bindTools(tools);

            // Prepare messages history
            const history = conversation.getFormattedHistory();
            const messages: BaseMessage[] = [
                this.getSystemMessage(),
                ...history.slice(0, -1).map(msg =>
                    msg.role === 'user' ? new HumanMessage(msg.content) :
                        msg.role === 'assistant' ? new AIMessage(msg.content) :
                            new SystemMessage(msg.content)
                ),
                new HumanMessage(message)
            ];

            // Agent Loop
            let finalResponse = '';
            const maxIterations = 5;

            for (let i = 0; i < maxIterations; i++) {
                Logger.info(`Agent iteration ${i + 1}/${maxIterations}`);

                const stream = await llmWithTools.stream(messages);
                let gathered: AIMessageChunk | null = null;

                for await (const chunk of stream) {
                    // Accumulate chunk
                    gathered = gathered ? gathered.concat(chunk) : chunk;

                    // Stream content tokens
                    if (chunk.content) {
                        const content = chunk.content as string;
                        finalResponse += content; // Only accumulate final text response
                        // Only stream tokens if we are not calling tools (or if model outputs text + tool)
                        // Usually models output text OR tool calls.
                        // If it's a tool call, content might be empty or reasoning.
                        if (!chunk.tool_call_chunks || chunk.tool_call_chunks.length === 0) {
                            onEvent({ type: 'token', data: content });
                        }
                    }
                }

                if (!gathered) break;

                messages.push(gathered);

                // Check for tool calls
                if (gathered.tool_calls && gathered.tool_calls.length > 0) {
                    // Reset finalResponse if we are executing tools, as the model will generate a new response after tool execution
                    finalResponse = '';

                    for (const toolCall of gathered.tool_calls) {
                        const tool = tools.find(t => t.name === toolCall.name);
                        if (tool) {
                            onEvent({
                                type: 'tool_start',
                                data: {
                                    name: toolCall.name,
                                    input: toolCall.args
                                }
                            });

                            Logger.info(`Executing tool ${toolCall.name}`);
                            let output;
                            try {
                                output = await tool.invoke(toolCall.args);
                            } catch (error) {
                                output = `Error: ${(error as Error).message}`;
                            }

                            onEvent({
                                type: 'tool_end',
                                data: {
                                    name: toolCall.name,
                                    output: output
                                }
                            });

                            messages.push(new ToolMessage({
                                tool_call_id: toolCall.id!,
                                content: output
                            }));
                        }
                    }
                    // Continue loop to let model process tool outputs
                } else {
                    // No tool calls, we are done
                    break;
                }
            }

            // Add assistant response to conversation
            if (finalResponse) {
                await this.conversationRepository.appendMessage(
                    conversation._id!,
                    'assistant',
                    finalResponse
                );
            }

            Logger.info(`Agent stream completed for conversation ${conversation._id!.toString()}`);
        } catch (error) {
            Logger.error('Error processing message stream:', error);
            throw error;
        }
    }

    /**
     * Process a user message and return the agent's response (Legacy/SMS)
     */
    public async processMessage(
        userId: ObjectId,
        phoneNumber: string,
        message: string,
        conversationId?: ObjectId
    ): Promise<AgentResponse> {
        try {
            Logger.info(`Processing message for user ${userId.toString()}: ${message.substring(0, 50)}...`);

            // Get or create conversation
            let conversation: Conversation;
            if (conversationId) {
                const existing = await this.conversationRepository.findById(conversationId);
                if (!existing) {
                    throw new Error('Conversation not found');
                }
                conversation = existing;
            } else {
                // For SMS, get or create conversation by phone number
                conversation = await this.conversationRepository.getOrCreateForUser(
                    userId,
                    phoneNumber
                );
            }

            // Add user message to conversation
            await this.conversationRepository.appendMessage(
                conversation._id!,
                'user',
                message
            );

            // Prepare tools
            const reminderTools = new ReminderTools(this.reminderRepository);
            const tools = reminderTools.getAllTools(userId, conversation._id!, phoneNumber);
            const llmWithTools = this.llm.bindTools(tools);

            // Prepare messages history
            const history = conversation.getFormattedHistory();
            const messages: BaseMessage[] = [
                this.getSystemMessage(),
                ...history.slice(0, -1).map(msg =>
                    msg.role === 'user' ? new HumanMessage(msg.content) :
                        msg.role === 'assistant' ? new AIMessage(msg.content) :
                            new SystemMessage(msg.content)
                ),
                new HumanMessage(message)
            ];

            // Agent Loop
            let finalResponse = '';
            const maxIterations = 5;

            for (let i = 0; i < maxIterations; i++) {
                const response = await llmWithTools.invoke(messages);
                messages.push(response);

                if (response.tool_calls && response.tool_calls.length > 0) {
                    for (const toolCall of response.tool_calls) {
                        const tool = tools.find(t => t.name === toolCall.name);
                        if (tool) {
                            Logger.info(`Executing tool ${toolCall.name}`);
                            let output;
                            try {
                                output = await tool.invoke(toolCall.args);
                            } catch (error) {
                                output = `Error: ${(error as Error).message}`;
                            }

                            messages.push(new ToolMessage({
                                tool_call_id: toolCall.id!,
                                content: output
                            }));
                        }
                    }
                } else {
                    finalResponse = response.content as string;
                    break;
                }
            }

            // Add assistant response to conversation
            await this.conversationRepository.appendMessage(
                conversation._id!,
                'assistant',
                finalResponse
            );

            Logger.info(`Agent response generated for conversation ${conversation._id!.toString()}`);

            return {
                response: finalResponse,
                conversationId: conversation._id!,
            };
        } catch (error) {
            Logger.error('Error processing message:', error);
            throw error;
        }
    }

    /**
     * Create a new conversation for a user
     */
    public async createConversation(userId: ObjectId, phoneNumber?: string): Promise<Conversation> {
        return await this.conversationRepository.getOrCreateForUser(userId, phoneNumber);
    }

    /**
     * Get a conversation by ID
     */
    public async getConversation(conversationId: ObjectId): Promise<Conversation | null> {
        return await this.conversationRepository.findById(conversationId);
    }

    /**
     * Get all conversations for a user
     */
    public async getUserConversations(userId: ObjectId): Promise<Conversation[]> {
        return await this.conversationRepository.findByUserId(userId);
    }
}
