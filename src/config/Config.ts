import dotenv from 'dotenv';
import { z } from 'zod';
import Logger from '../utils/Logger';

dotenv.config();

const ConfigSchema = z.object({
    // Server Configuration
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().default(3000),
    host: z.string().default('localhost'),

    // MongoDB Configuration
    mongodbUri: z.string().min(1, 'MongoDB URI is required'),

    // OpenAI Configuration
    openaiApiKey: z.string().min(1, 'OpenAI API key is required'),
    openaiModel: z.string().default('gpt-4o-mini'),

    // Twilio Configuration
    twilioAccountSid: z.string().min(1, 'Twilio Account SID is required'),
    twilioAuthToken: z.string().min(1, 'Twilio Auth Token is required'),
    twilioPhoneNumber: z.string().min(1, 'Twilio Phone Number is required'),

    // JWT Configuration
    jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    jwtExpiresIn: z.string().default('7d'),

    // Logging Configuration
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    logFilePath: z.string().default('./logs/app.log'),

    // Reminder Scheduler Configuration
    reminderCheckInterval: z.string().default('* * * * *'), // Every minute
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
    private config: Config;

    constructor() {
        try {
            this.config = ConfigSchema.parse({
                nodeEnv: process.env.NODE_ENV,
                port: process.env.PORT,
                host: process.env.HOST,
                mongodbUri: process.env.MONGODB_URI,
                openaiApiKey: process.env.OPENAI_API_KEY,
                openaiModel: process.env.OPENAI_MODEL,
                twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
                twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
                twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
                jwtSecret: process.env.JWT_SECRET,
                jwtExpiresIn: process.env.JWT_EXPIRES_IN,
                logLevel: process.env.LOG_LEVEL,
                logFilePath: process.env.LOG_FILE_PATH,
                reminderCheckInterval: process.env.REMINDER_CHECK_INTERVAL,
            });

            Logger.info('Configuration loaded successfully');
        } catch (error) {
            if (error instanceof z.ZodError) {
                Logger.error('Configuration validation failed:', error.errors);
                throw new Error(`Invalid configuration: ${JSON.stringify(error.errors)}`);
            }
            throw error;
        }
    }

    public get(): Config {
        return this.config;
    }

    public isDevelopment(): boolean {
        return this.config.nodeEnv === 'development';
    }

    public isProduction(): boolean {
        return this.config.nodeEnv === 'production';
    }

    public isTest(): boolean {
        return this.config.nodeEnv === 'test';
    }
}

export default new ConfigManager();
