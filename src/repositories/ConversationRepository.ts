import { Collection, ObjectId } from 'mongodb';
import { IRepository } from './IRepository';
import { Conversation, ConversationDocument } from '../models/Conversation';
import MongoDBConnection from '../database/MongoDBConnection';
import Logger from '../utils/Logger';

export class ConversationRepository implements IRepository<Conversation> {
    private collection: Collection<ConversationDocument>;

    constructor() {
        const db = MongoDBConnection.getDb();
        this.collection = db.collection<ConversationDocument>('conversations');
    }

    public async findById(id: ObjectId): Promise<Conversation | null> {
        try {
            const doc = await this.collection.findOne({ _id: id });
            return doc ? Conversation.fromDocument(doc) : null;
        } catch (error) {
            Logger.error(`Error finding conversation by ID ${id.toString()}:`, error);
            throw error;
        }
    }

    public async findOne(filter: Record<string, unknown>): Promise<Conversation | null> {
        try {
            const doc = await this.collection.findOne(filter);
            return doc ? Conversation.fromDocument(doc) : null;
        } catch (error) {
            Logger.error('Error finding conversation:', error);
            throw error;
        }
    }

    public async findMany(filter: Record<string, unknown>): Promise<Conversation[]> {
        try {
            const docs = await this.collection.find(filter).sort({ lastMessageAt: -1 }).toArray();
            return docs.map((doc) => Conversation.fromDocument(doc));
        } catch (error) {
            Logger.error('Error finding conversations:', error);
            throw error;
        }
    }

    public async create(conversation: Conversation): Promise<Conversation> {
        try {
            conversation.updateTimestamp();
            const result = await this.collection.insertOne(conversation.toDocument());
            conversation._id = result.insertedId;
            Logger.info(`Conversation created with ID: ${result.insertedId.toString()}`);
            return conversation;
        } catch (error) {
            Logger.error('Error creating conversation:', error);
            throw error;
        }
    }

    public async update(id: ObjectId, data: Partial<Conversation>): Promise<Conversation | null> {
        try {
            const updateData = { ...data, updatedAt: new Date() };
            const result = await this.collection.findOneAndUpdate(
                { _id: id },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (!result) {
                Logger.warn(`Conversation not found for update: ${id.toString()}`);
                return null;
            }

            Logger.info(`Conversation updated: ${id.toString()}`);
            return Conversation.fromDocument(result);
        } catch (error) {
            Logger.error(`Error updating conversation ${id.toString()}:`, error);
            throw error;
        }
    }

    public async delete(id: ObjectId): Promise<boolean> {
        try {
            const result = await this.collection.deleteOne({ _id: id });
            const deleted = result.deletedCount > 0;
            if (deleted) {
                Logger.info(`Conversation deleted: ${id.toString()}`);
            } else {
                Logger.warn(`Conversation not found for deletion: ${id.toString()}`);
            }
            return deleted;
        } catch (error) {
            Logger.error(`Error deleting conversation ${id.toString()}:`, error);
            throw error;
        }
    }

    public async count(filter: Record<string, unknown>): Promise<number> {
        try {
            return await this.collection.countDocuments(filter);
        } catch (error) {
            Logger.error('Error counting conversations:', error);
            throw error;
        }
    }

    // Custom methods specific to Conversation
    public async findByUserId(userId: ObjectId): Promise<Conversation[]> {
        return this.findMany({ userId });
    }

    public async findByPhoneNumber(phoneNumber: string): Promise<Conversation | null> {
        return this.findOne({ phoneNumber });
    }

    public async appendMessage(
        id: ObjectId,
        role: 'user' | 'assistant' | 'system',
        content: string
    ): Promise<Conversation | null> {
        try {
            const conversation = await this.findById(id);
            if (!conversation) {
                Logger.warn(`Conversation not found for message append: ${id.toString()}`);
                return null;
            }

            conversation.addMessage(role, content);
            await this.collection.updateOne(
                { _id: id },
                {
                    $set: {
                        messages: conversation.messages,
                        title: conversation.title,
                        lastMessageAt: conversation.lastMessageAt,
                        updatedAt: conversation.updatedAt,
                    },
                }
            );

            Logger.info(`Message appended to conversation: ${id.toString()}`);
            return conversation;
        } catch (error) {
            Logger.error(`Error appending message to conversation ${id.toString()}:`, error);
            throw error;
        }
    }

    public async getOrCreateForUser(userId: ObjectId, phoneNumber?: string): Promise<Conversation> {
        try {
            // For SMS conversations, find by phone number
            if (phoneNumber) {
                const existing = await this.findByPhoneNumber(phoneNumber);
                if (existing) {
                    return existing;
                }
            }

            // Create new conversation
            const conversation = new Conversation({
                userId,
                phoneNumber,
                title: 'New Conversation',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastMessageAt: new Date(),
            });

            return await this.create(conversation);
        } catch (error) {
            Logger.error('Error getting or creating conversation:', error);
            throw error;
        }
    }
}
