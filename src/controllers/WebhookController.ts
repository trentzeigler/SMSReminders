import { Request, Response } from 'express';
import { TwilioService } from '../services/TwilioService';
import { AgentService } from '../agent/AgentService';
import { UserRepository } from '../repositories/UserRepository';
import Logger from '../utils/Logger';

export class WebhookController {
    private twilioService: TwilioService;
    private agentService: AgentService;
    private userRepository: UserRepository;

    constructor(
        twilioService: TwilioService,
        agentService: AgentService,
        userRepository: UserRepository
    ) {
        this.twilioService = twilioService;
        this.agentService = agentService;
        this.userRepository = userRepository;
    }

    /**
     * Handle incoming Twilio webhook
     */
    public handleIncomingSMS = async (req: Request, res: Response): Promise<void> => {
        try {
            Logger.info('Received Twilio webhook');

            // Validate webhook signature in production
            if (process.env.NODE_ENV === 'production') {
                const signature = req.headers['x-twilio-signature'] as string;
                const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
                const params = req.body as Record<string, string>;

                if (!this.twilioService.validateWebhookSignature(signature, url, params)) {
                    Logger.warn('Invalid Twilio webhook signature');
                    res.status(403).send('Forbidden');
                    return;
                }
            }

            // Extract message and sender
            const { from, message } = TwilioService.extractWebhookData(
                req.body as Record<string, string>
            );

            if (!from || !message) {
                Logger.warn('Missing from or message in webhook payload');
                res.status(400).send('Bad Request');
                return;
            }

            Logger.info(`Processing SMS from ${from}: ${message.substring(0, 50)}...`);

            // Find or create user
            const user = await this.userRepository.upsertByPhoneNumber(from);

            // Process message through agent
            const { response } = await this.agentService.processMessage(
                user._id!,
                from,
                message
            );

            // Send response via SMS
            await this.twilioService.sendSMS(from, response);

            // Respond to Twilio with TwiML (empty response, we already sent the SMS)
            res.type('text/xml');
            res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        } catch (error) {
            Logger.error('Error handling incoming SMS:', error);

            // Try to send error message to user
            try {
                const { from } = TwilioService.extractWebhookData(
                    req.body as Record<string, string>
                );
                if (from) {
                    await this.twilioService.sendSMS(
                        from,
                        "I'm sorry, I encountered an error processing your message. Please try again later."
                    );
                }
            } catch (sendError) {
                Logger.error('Failed to send error message to user:', sendError);
            }

            res.type('text/xml');
            res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        }
    };
}
