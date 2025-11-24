import twilio from 'twilio';
import ConfigManager from '../config/Config';
import Logger from '../utils/Logger';

export class TwilioService {
    private client: twilio.Twilio;
    private phoneNumber: string;
    private authToken: string;

    constructor() {
        const config = ConfigManager.get();

        this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
        this.phoneNumber = config.twilioPhoneNumber;
        this.authToken = config.twilioAuthToken;

        Logger.info('TwilioService initialized');
    }

    /**
     * Send an SMS message
     */
    public async sendSMS(to: string, message: string): Promise<void> {
        try {
            Logger.info(`Sending SMS to ${to}: ${message.substring(0, 50)}...`);

            const result = await this.client.messages.create({
                body: message,
                from: this.phoneNumber,
                to: to,
            });

            Logger.info(`SMS sent successfully. SID: ${result.sid}`);
        } catch (error) {
            Logger.error(`Failed to send SMS to ${to}:`, error);
            throw error;
        }
    }

    /**
     * Validate Twilio webhook signature
     */
    public validateWebhookSignature(
        signature: string,
        url: string,
        params: Record<string, string>
    ): boolean {
        try {
            return twilio.validateRequest(this.authToken, signature, url, params);
        } catch (error) {
            Logger.error('Error validating Twilio webhook signature:', error);
            return false;
        }
    }

    /**
     * Format phone number to E.164 format
     */
    public static formatPhoneNumber(phoneNumber: string): string {
        // Remove all non-digit characters
        const digits = phoneNumber.replace(/\D/g, '');

        // If it starts with 1 and has 11 digits (US/Canada), format it
        if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }

        // If it has 10 digits (US/Canada without country code), add +1
        if (digits.length === 10) {
            return `+1${digits}`;
        }

        // If it already starts with +, return as is
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }

        // Otherwise, assume it needs a + prefix
        return `+${digits}`;
    }

    /**
     * Extract message and sender from Twilio webhook payload
     */
    public static extractWebhookData(body: Record<string, string>): {
        from: string;
        message: string;
    } {
        return {
            from: TwilioService.formatPhoneNumber(body.From || ''),
            message: body.Body || '',
        };
    }
}
