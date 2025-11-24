import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { AgentService } from '../agent/AgentService';
import { ReminderRepository } from '../repositories/ReminderRepository';
import { AuthRequest } from '../middleware/AuthMiddleware';
import Logger from '../utils/Logger';

export class ChatController {
    private agentService: AgentService;
    private reminderRepository: ReminderRepository;

    constructor(agentService: AgentService, reminderRepository: ReminderRepository) {
        this.agentService = agentService;
        this.reminderRepository = reminderRepository;
    }

    /**
     * Render the chat page
     */
    public renderChatPage = async (_req: AuthRequest, res: Response): Promise<void> => {
        try {
            res.render('chat');
        } catch (error) {
            Logger.error('Error rendering chat page:', error);
            res.status(500).send('Internal Server Error');
        }
    };

    /**
     * Render the login page
     */
    public renderLoginPage = (_req: AuthRequest, res: Response): void => {
        res.render('login');
    };

    /**
     * Render the signup page
     */
    public renderSignupPage = (_req: AuthRequest, res: Response): void => {
        res.render('signup');
    };

    /**
     * Process a chat message
     */
    /**
     * Process a chat message with streaming
     */
    public processMessage = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const { message, conversationId } = req.body as {
                message: string;
                conversationId?: string;
            };

            if (!message) {
                res.status(400).json({ error: 'Message is required' });
                return;
            }

            Logger.info(
                `Processing chat message for user ${req.user.userId.toString()}: ${message.substring(0, 50)}...`
            );

            const phoneNumber = req.user.phoneNumber || '';
            const convId = conversationId ? new ObjectId(conversationId) : undefined;

            // Set SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            await this.agentService.processMessageStream(
                req.user.userId,
                phoneNumber,
                message,
                convId,
                (event) => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
            );

            res.write('data: [DONE]\n\n');
            res.end();
        } catch (error) {
            Logger.error('Error processing chat message:', error);
            // If headers haven't been sent, send JSON error
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to process message' });
            } else {
                // Otherwise send error event
                res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal Server Error' })}\n\n`);
                res.end();
            }
        }
    };

    /**
     * Get all conversations for the current user
     */
    public getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const conversations = await this.agentService.getUserConversations(req.user.userId);

            res.json({
                conversations: conversations.map((conv) => ({
                    id: conv._id!.toString(),
                    title: conv.title,
                    lastMessageAt: conv.lastMessageAt,
                    messageCount: conv.messages.length,
                })),
            });
        } catch (error) {
            Logger.error('Error getting conversations:', error);
            res.status(500).json({ error: 'Failed to get conversations' });
        }
    };

    /**
     * Create a new conversation
     */
    public createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const conversation = await this.agentService.createConversation(
                req.user.userId,
                req.user.phoneNumber
            );

            res.status(201).json({
                conversation: {
                    id: conversation._id!.toString(),
                    title: conversation.title,
                    createdAt: conversation.createdAt,
                },
            });
        } catch (error) {
            Logger.error('Error creating conversation:', error);
            res.status(500).json({ error: 'Failed to create conversation' });
        }
    };

    /**
     * Get a specific conversation with messages
     */
    public getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            const conversation = await this.agentService.getConversation(new ObjectId(id));

            if (!conversation) {
                res.status(404).json({ error: 'Conversation not found' });
                return;
            }

            // Verify ownership
            if (!conversation.userId.equals(req.user.userId)) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            res.json({
                conversation: {
                    id: conversation._id!.toString(),
                    title: conversation.title,
                    messages: conversation.messages,
                    createdAt: conversation.createdAt,
                    lastMessageAt: conversation.lastMessageAt,
                },
            });
        } catch (error) {
            Logger.error('Error getting conversation:', error);
            res.status(500).json({ error: 'Failed to get conversation' });
        }
    };

    /**
     * Get all reminders for the current user
     */
    public getReminders = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const reminders = await this.reminderRepository.findByUserId(req.user.userId);

            res.json({
                reminders: reminders.map((r) => ({
                    id: r._id!.toString(),
                    title: r.title,
                    description: r.description,
                    scheduledFor: r.scheduledFor,
                    status: r.status,
                    createdAt: r.createdAt,
                })),
            });
        } catch (error) {
            Logger.error('Error getting reminders:', error);
            res.status(500).json({ error: 'Failed to get reminders' });
        }
    };
}
