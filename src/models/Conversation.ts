import { ObjectId } from 'mongodb';
import { z } from 'zod';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

// Zod schema for validation
export const MessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.date(),
});

export const ConversationSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    userId: z.instanceof(ObjectId),
    phoneNumber: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format')
        .optional(),
    title: z.string().min(1).max(200),
    messages: z.array(MessageSchema).default([]),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    lastMessageAt: z.date().default(() => new Date()),
});

export type ConversationDocument = z.infer<typeof ConversationSchema>;

export interface IConversation {
    _id?: ObjectId;
    userId: ObjectId;
    phoneNumber?: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date;
}

export class Conversation implements IConversation {
    public _id?: ObjectId;
    public userId: ObjectId;
    public phoneNumber?: string;
    public title: string;
    public messages: Message[];
    public createdAt: Date;
    public updatedAt: Date;
    public lastMessageAt: Date;

    constructor(data: IConversation) {
        this._id = data._id;
        this.userId = data.userId;
        this.phoneNumber = data.phoneNumber;
        this.title = data.title;
        this.messages = data.messages;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.lastMessageAt = data.lastMessageAt;

        this.validate();
    }

    private validate(): void {
        ConversationSchema.parse(this);
    }

    public toDocument(): ConversationDocument {
        return {
            _id: this._id,
            userId: this.userId,
            phoneNumber: this.phoneNumber,
            title: this.title,
            messages: this.messages,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastMessageAt: this.lastMessageAt,
        };
    }

    public static fromDocument(doc: ConversationDocument): Conversation {
        return new Conversation({
            _id: doc._id,
            userId: doc.userId,
            phoneNumber: doc.phoneNumber,
            title: doc.title,
            messages: doc.messages,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            lastMessageAt: doc.lastMessageAt,
        });
    }

    public addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
        const message: Message = {
            role,
            content,
            timestamp: new Date(),
        };

        this.messages.push(message);
        this.lastMessageAt = message.timestamp;
        this.updatedAt = message.timestamp;

        // Auto-generate title from first user message if title is generic
        if (this.messages.length === 1 && role === 'user') {
            this.title = this.generateTitle(content);
        }
    }

    private generateTitle(firstMessage: string): string {
        // Take first 50 characters or until first newline
        const title = firstMessage.split('\n')[0].substring(0, 50);
        return title.length < firstMessage.length ? `${title}...` : title;
    }

    public getMessageHistory(): Message[] {
        return [...this.messages];
    }

    public getFormattedHistory(): Array<{ role: string; content: string }> {
        return this.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
    }

    public updateTimestamp(): void {
        this.updatedAt = new Date();
    }
}
