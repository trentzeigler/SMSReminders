import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import MongoDBConnection from './database/MongoDBConnection';
import { UserRepository } from './repositories/UserRepository';
import { ReminderRepository } from './repositories/ReminderRepository';
import { ConversationRepository } from './repositories/ConversationRepository';
import { AgentService } from './agent/AgentService';
import { TwilioService } from './services/TwilioService';
import { ReminderScheduler } from './services/ReminderScheduler';
import OTPService from './services/OTPService';
import { AuthController } from './controllers/AuthController';
import { ChatController } from './controllers/ChatController';
import { WebhookController } from './controllers/WebhookController';
import { AuthMiddleware } from './middleware/AuthMiddleware';
import ConfigManager from './config/Config';
import Logger from './utils/Logger';

class Server {
    private app: Express;
    private reminderScheduler: ReminderScheduler | null = null;

    constructor() {
        this.app = express();
        this.setupMiddleware();
    }

    private setupMiddleware(): void {
        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use(express.static(path.join(__dirname, '../public')));

        // View engine
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));

        // Request logging
        this.app.use((req: Request, _res: Response, next: NextFunction) => {
            Logger.info(`${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        // Initialize repositories
        const userRepository = new UserRepository();
        const reminderRepository = new ReminderRepository();
        const conversationRepository = new ConversationRepository();

        // Initialize services
        const agentService = new AgentService(reminderRepository, conversationRepository);
        const twilioService = new TwilioService();

        // Initialize controllers
        const authController = new AuthController(userRepository);
        const chatController = new ChatController(agentService, reminderRepository);
        const webhookController = new WebhookController(
            twilioService,
            agentService,
            userRepository
        );

        // Public routes
        this.app.get('/', chatController.renderLoginPage);
        this.app.get('/chat', chatController.renderChatPage);
        this.app.get('/login', chatController.renderLoginPage);
        this.app.get('/signup', chatController.renderSignupPage);
        this.app.get('/forgot-password', (_req, res) => res.render('forgot-password'));

        // Auth routes
        this.app.post('/api/auth/signup', authController.signup);
        this.app.post('/api/auth/login', authController.login);
        this.app.post('/api/auth/logout', authController.logout);
        this.app.post('/api/auth/forgot-password', authController.forgotPassword);
        this.app.post('/api/auth/reset-password', authController.resetPassword);
        this.app.get('/api/auth/me', AuthMiddleware.authenticate, authController.me);

        // Twilio webhook
        this.app.post('/api/webhook/sms', webhookController.handleIncomingSMS);

        // Protected chat routes
        this.app.post('/api/chat', AuthMiddleware.authenticate, chatController.processMessage);
        this.app.get(
            '/api/conversations',
            AuthMiddleware.authenticate,
            chatController.getConversations
        );
        this.app.post(
            '/api/conversations',
            AuthMiddleware.authenticate,
            chatController.createConversation
        );
        this.app.get(
            '/api/conversations/:id',
            AuthMiddleware.authenticate,
            chatController.getConversation
        );
        this.app.get('/api/reminders', AuthMiddleware.authenticate, chatController.getReminders);

        // Health check
        this.app.get('/health', async (_req: Request, res: Response) => {
            const dbHealthy = await MongoDBConnection.healthCheck();
            const schedulerStatus = this.reminderScheduler?.getStatus();

            res.json({
                status: dbHealthy ? 'healthy' : 'unhealthy',
                database: dbHealthy,
                scheduler: schedulerStatus,
                timestamp: new Date().toISOString(),
            });
        });

        // Error handling middleware
        this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
            Logger.error('Unhandled error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // 404 handler
        this.app.use((_req: Request, res: Response) => {
            res.status(404).json({ error: 'Not found' });
        });

        // Initialize reminder scheduler
        this.reminderScheduler = new ReminderScheduler(reminderRepository, twilioService);
        this.reminderScheduler.start();

        // Start OTP cleanup service
        OTPService.startCleanup();
    }

    public async start(): Promise<void> {
        try {
            const config = ConfigManager.get();

            // Connect to MongoDB
            await MongoDBConnection.connect();

            // Setup routes
            this.setupRoutes();

            // Start server
            this.app.listen(config.port, config.host, () => {
                Logger.info(`Server running on http://${config.host}:${config.port}`);
                Logger.info(`Environment: ${config.nodeEnv}`);
            });

            // Graceful shutdown
            this.setupGracefulShutdown();
        } catch (error) {
            Logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string): Promise<void> => {
            Logger.info(`Received ${signal}, starting graceful shutdown...`);

            try {
                // Stop reminder scheduler
                if (this.reminderScheduler) {
                    this.reminderScheduler.stop();
                }

                // Disconnect from MongoDB
                await MongoDBConnection.disconnect();

                Logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                Logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => void shutdown('SIGTERM'));
        process.on('SIGINT', () => void shutdown('SIGINT'));
    }
}

// Start the server
const server = new Server();
void server.start();
