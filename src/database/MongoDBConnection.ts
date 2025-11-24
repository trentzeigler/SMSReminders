import { MongoClient, Db } from 'mongodb';
import Logger from '../utils/Logger';
import ConfigManager from '../config/Config';

class MongoDBConnection {
    private static instance: MongoDBConnection;
    private client: MongoClient | null = null;
    private db: Db | null = null;

    private constructor() { }

    public static getInstance(): MongoDBConnection {
        if (!MongoDBConnection.instance) {
            MongoDBConnection.instance = new MongoDBConnection();
        }
        return MongoDBConnection.instance;
    }

    public async connect(): Promise<void> {
        if (this.client && this.db) {
            Logger.info('MongoDB already connected');
            return;
        }

        try {
            const config = ConfigManager.get();
            Logger.info('Connecting to MongoDB...');

            this.client = new MongoClient(config.mongodbUri, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            await this.client.connect();
            this.db = this.client.db();

            Logger.info('MongoDB connected successfully');

            // Create indexes
            await this.createIndexes();
        } catch (error) {
            Logger.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            Logger.info('Disconnecting from MongoDB...');
            await this.client.close();
            this.client = null;
            this.db = null;
            Logger.info('MongoDB disconnected successfully');
        }
    }

    public getDb(): Db {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    private async createIndexes(): Promise<void> {
        if (!this.db) return;

        try {
            Logger.info('Creating database indexes...');

            // Users collection indexes
            await this.db.collection('users').createIndex({ phoneNumber: 1 }, { unique: true });
            await this.db
                .collection('users')
                .createIndex({ email: 1 }, { unique: true, sparse: true });

            // Reminders collection indexes
            await this.db.collection('reminders').createIndex({ userId: 1 });
            await this.db.collection('reminders').createIndex({ phoneNumber: 1 });
            await this.db.collection('reminders').createIndex({ conversationId: 1 });
            await this.db.collection('reminders').createIndex({ scheduledFor: 1 });
            await this.db.collection('reminders').createIndex({ status: 1 });
            await this.db
                .collection('reminders')
                .createIndex({ status: 1, scheduledFor: 1 }); // Compound index for scheduler

            // Conversations collection indexes
            await this.db.collection('conversations').createIndex({ userId: 1 });
            await this.db.collection('conversations').createIndex({ phoneNumber: 1 });
            await this.db.collection('conversations').createIndex({ lastMessageAt: -1 }); // For sorting

            Logger.info('Database indexes created successfully');
        } catch (error) {
            Logger.error('Failed to create indexes:', error);
            throw error;
        }
    }

    public async healthCheck(): Promise<boolean> {
        try {
            if (!this.db) return false;
            await this.db.admin().ping();
            return true;
        } catch (error) {
            Logger.error('MongoDB health check failed:', error);
            return false;
        }
    }
}

export default MongoDBConnection.getInstance();
