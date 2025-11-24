import { Collection, ObjectId } from 'mongodb';
import { IRepository } from './IRepository';
import { User, UserDocument } from '../models/User';
import MongoDBConnection from '../database/MongoDBConnection';
import Logger from '../utils/Logger';

export class UserRepository implements IRepository<User> {
    private collection: Collection<UserDocument>;

    constructor() {
        const db = MongoDBConnection.getDb();
        this.collection = db.collection<UserDocument>('users');
    }

    public async findById(id: ObjectId): Promise<User | null> {
        try {
            const doc = await this.collection.findOne({ _id: id });
            return doc ? User.fromDocument(doc) : null;
        } catch (error) {
            Logger.error(`Error finding user by ID ${id.toString()}:`, error);
            throw error;
        }
    }

    public async findOne(filter: Record<string, unknown>): Promise<User | null> {
        try {
            const doc = await this.collection.findOne(filter);
            return doc ? User.fromDocument(doc) : null;
        } catch (error) {
            Logger.error('Error finding user:', error);
            throw error;
        }
    }

    public async findMany(filter: Record<string, unknown>): Promise<User[]> {
        try {
            const docs = await this.collection.find(filter).toArray();
            return docs.map((doc) => User.fromDocument(doc));
        } catch (error) {
            Logger.error('Error finding users:', error);
            throw error;
        }
    }

    public async create(user: User): Promise<User> {
        try {
            user.updateTimestamp();
            const result = await this.collection.insertOne(user.toDocument());
            user._id = result.insertedId;
            Logger.info(`User created with ID: ${result.insertedId.toString()}`);
            return user;
        } catch (error) {
            Logger.error('Error creating user:', error);
            throw error;
        }
    }

    public async update(id: ObjectId, data: Partial<User>): Promise<User | null> {
        try {
            const updateData = { ...data, updatedAt: new Date() };
            const result = await this.collection.findOneAndUpdate(
                { _id: id },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (!result) {
                Logger.warn(`User not found for update: ${id.toString()}`);
                return null;
            }

            Logger.info(`User updated: ${id.toString()}`);
            return User.fromDocument(result);
        } catch (error) {
            Logger.error(`Error updating user ${id.toString()}:`, error);
            throw error;
        }
    }

    public async delete(id: ObjectId): Promise<boolean> {
        try {
            const result = await this.collection.deleteOne({ _id: id });
            const deleted = result.deletedCount > 0;
            if (deleted) {
                Logger.info(`User deleted: ${id.toString()}`);
            } else {
                Logger.warn(`User not found for deletion: ${id.toString()}`);
            }
            return deleted;
        } catch (error) {
            Logger.error(`Error deleting user ${id.toString()}:`, error);
            throw error;
        }
    }

    public async count(filter: Record<string, unknown>): Promise<number> {
        try {
            return await this.collection.countDocuments(filter);
        } catch (error) {
            Logger.error('Error counting users:', error);
            throw error;
        }
    }

    // Custom methods specific to User
    public async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        return this.findOne({ phoneNumber });
    }

    public async findByEmail(email: string): Promise<User | null> {
        return this.findOne({ email });
    }

    public async upsertByPhoneNumber(phoneNumber: string): Promise<User> {
        try {
            const existingUser = await this.findByPhoneNumber(phoneNumber);
            if (existingUser) {
                return existingUser;
            }

            const newUser = new User({
                phoneNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            return await this.create(newUser);
        } catch (error) {
            Logger.error(`Error upserting user by phone number ${phoneNumber}:`, error);
            throw error;
        }
    }
}
