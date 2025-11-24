import { Collection, ObjectId } from 'mongodb';
import { IRepository } from './IRepository';
import { Reminder, ReminderDocument, ReminderStatus } from '../models/Reminder';
import MongoDBConnection from '../database/MongoDBConnection';
import Logger from '../utils/Logger';

export class ReminderRepository implements IRepository<Reminder> {
    private collection: Collection<ReminderDocument>;

    constructor() {
        const db = MongoDBConnection.getDb();
        this.collection = db.collection<ReminderDocument>('reminders');
    }

    public async findById(id: ObjectId): Promise<Reminder | null> {
        try {
            const doc = await this.collection.findOne({ _id: id });
            return doc ? Reminder.fromDocument(doc) : null;
        } catch (error) {
            Logger.error(`Error finding reminder by ID ${id.toString()}:`, error);
            throw error;
        }
    }

    public async findOne(filter: Record<string, unknown>): Promise<Reminder | null> {
        try {
            const doc = await this.collection.findOne(filter);
            return doc ? Reminder.fromDocument(doc) : null;
        } catch (error) {
            Logger.error('Error finding reminder:', error);
            throw error;
        }
    }

    public async findMany(filter: Record<string, unknown>): Promise<Reminder[]> {
        try {
            const docs = await this.collection.find(filter).sort({ scheduledFor: 1 }).toArray();
            return docs.map((doc) => Reminder.fromDocument(doc));
        } catch (error) {
            Logger.error('Error finding reminders:', error);
            throw error;
        }
    }

    public async create(reminder: Reminder): Promise<Reminder> {
        try {
            reminder.updateTimestamp();
            const result = await this.collection.insertOne(reminder.toDocument());
            reminder._id = result.insertedId;
            Logger.info(`Reminder created with ID: ${result.insertedId.toString()}`);
            return reminder;
        } catch (error) {
            Logger.error('Error creating reminder:', error);
            throw error;
        }
    }

    public async update(id: ObjectId, data: Partial<Reminder>): Promise<Reminder | null> {
        try {
            const updateData = { ...data, updatedAt: new Date() };
            const result = await this.collection.findOneAndUpdate(
                { _id: id },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (!result) {
                Logger.warn(`Reminder not found for update: ${id.toString()}`);
                return null;
            }

            Logger.info(`Reminder updated: ${id.toString()}`);
            return Reminder.fromDocument(result);
        } catch (error) {
            Logger.error(`Error updating reminder ${id.toString()}:`, error);
            throw error;
        }
    }

    public async delete(id: ObjectId): Promise<boolean> {
        try {
            const result = await this.collection.deleteOne({ _id: id });
            const deleted = result.deletedCount > 0;
            if (deleted) {
                Logger.info(`Reminder deleted: ${id.toString()}`);
            } else {
                Logger.warn(`Reminder not found for deletion: ${id.toString()}`);
            }
            return deleted;
        } catch (error) {
            Logger.error(`Error deleting reminder ${id.toString()}:`, error);
            throw error;
        }
    }

    public async count(filter: Record<string, unknown>): Promise<number> {
        try {
            return await this.collection.countDocuments(filter);
        } catch (error) {
            Logger.error('Error counting reminders:', error);
            throw error;
        }
    }

    // Custom methods specific to Reminder
    public async findByUserId(userId: ObjectId): Promise<Reminder[]> {
        return this.findMany({ userId });
    }

    public async findByPhoneNumber(phoneNumber: string): Promise<Reminder[]> {
        return this.findMany({ phoneNumber });
    }

    public async findByConversationId(conversationId: ObjectId): Promise<Reminder[]> {
        return this.findMany({ conversationId });
    }

    public async findPendingReminders(): Promise<Reminder[]> {
        return this.findMany({ status: ReminderStatus.PENDING });
    }

    public async findDueReminders(currentTime: Date = new Date()): Promise<Reminder[]> {
        try {
            const docs = await this.collection
                .find({
                    status: ReminderStatus.PENDING,
                    scheduledFor: { $lte: currentTime },
                })
                .toArray();

            return docs.map((doc) => Reminder.fromDocument(doc));
        } catch (error) {
            Logger.error('Error finding due reminders:', error);
            throw error;
        }
    }

    public async updateStatus(id: ObjectId, status: ReminderStatus): Promise<Reminder | null> {
        return this.update(id, { status });
    }

    public async markAsSent(id: ObjectId): Promise<Reminder | null> {
        return this.updateStatus(id, ReminderStatus.SENT);
    }

    public async cancelReminder(id: ObjectId): Promise<Reminder | null> {
        return this.updateStatus(id, ReminderStatus.CANCELLED);
    }
}
