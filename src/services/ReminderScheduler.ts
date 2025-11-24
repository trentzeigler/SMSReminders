import cron from 'node-cron';
import { ReminderRepository } from '../repositories/ReminderRepository';
import { Reminder } from '../models/Reminder';
import { TwilioService } from './TwilioService';
import ConfigManager from '../config/Config';
import Logger from '../utils/Logger';

export class ReminderScheduler {
    private reminderRepository: ReminderRepository;
    private twilioService: TwilioService;
    private cronJob: cron.ScheduledTask | null = null;
    private isRunning = false;

    constructor(reminderRepository: ReminderRepository, twilioService: TwilioService) {
        this.reminderRepository = reminderRepository;
        this.twilioService = twilioService;
    }

    /**
     * Start the reminder scheduler
     */
    public start(): void {
        if (this.isRunning) {
            Logger.warn('Reminder scheduler is already running');
            return;
        }

        const config = ConfigManager.get();
        const interval = config.reminderCheckInterval;

        Logger.info(`Starting reminder scheduler with interval: ${interval}`);

        this.cronJob = cron.schedule(interval, async () => {
            await this.checkAndSendReminders();
        });

        this.isRunning = true;
        Logger.info('Reminder scheduler started successfully');
    }

    /**
     * Stop the reminder scheduler
     */
    public stop(): void {
        if (!this.isRunning || !this.cronJob) {
            Logger.warn('Reminder scheduler is not running');
            return;
        }

        Logger.info('Stopping reminder scheduler...');
        this.cronJob.stop();
        this.cronJob = null;
        this.isRunning = false;
        Logger.info('Reminder scheduler stopped');
    }

    /**
     * Check for due reminders and send them
     */
    private async checkAndSendReminders(): Promise<void> {
        try {
            const now = new Date();
            Logger.debug(`Checking for due reminders at ${now.toISOString()}`);

            // Find all reminders that are due
            const dueReminders = await this.reminderRepository.findDueReminders(now);

            if (dueReminders.length === 0) {
                Logger.info('No due reminders found');
                return;
            }

            Logger.info(`Found ${dueReminders.length} due reminder(s)`);

            // Process each reminder
            for (const reminder of dueReminders) {
                try {
                    await this.sendReminder(reminder);
                } catch (error) {
                    Logger.error(
                        `Failed to send reminder ${reminder._id?.toString()}:`,
                        error
                    );
                    // Continue processing other reminders even if one fails
                }
            }
        } catch (error) {
            Logger.error('Error checking for due reminders:', error);
        }
    }

    /**
     * Send a single reminder via SMS
     */
    private async sendReminder(
        reminder: Reminder
    ): Promise<void> {
        try {
            Logger.info(
                `Sending reminder ${reminder._id?.toString()} to ${reminder.phoneNumber}`
            );

            // Format the reminder message
            const message = this.formatReminderMessage(reminder);

            // Send SMS
            await this.twilioService.sendSMS(reminder.phoneNumber, message);

            // Mark reminder as sent
            if (reminder._id) {
                await this.reminderRepository.markAsSent(reminder._id);
                Logger.info(`Reminder ${reminder._id.toString()} marked as sent`);
            }
        } catch (error) {
            Logger.error(
                `Error sending reminder ${reminder._id?.toString()}:`,
                error
            );
            throw error;
        }
    }

    /**
     * Format the reminder message for SMS
     */
    private formatReminderMessage(
        reminder: Reminder
    ): string {
        let message = `🔔 Reminder: ${reminder.title}`;

        if (reminder.description) {
            message += `\n\n${reminder.description}`;
        }

        message += `\n\nScheduled for: ${reminder.scheduledFor.toLocaleString()}`;

        return message;
    }

    /**
     * Check if the scheduler is running
     */
    public getStatus(): { isRunning: boolean; interval: string } {
        const config = ConfigManager.get();
        return {
            isRunning: this.isRunning,
            interval: config.reminderCheckInterval,
        };
    }

    /**
     * Manually trigger a check for due reminders (useful for testing)
     */
    public async triggerCheck(): Promise<void> {
        Logger.info('Manually triggering reminder check');
        await this.checkAndSendReminders();
    }
}
