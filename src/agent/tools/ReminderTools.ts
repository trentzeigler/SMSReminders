import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { ReminderRepository } from '../../repositories/ReminderRepository';
import { Reminder, ReminderStatus } from '../../models/Reminder';
import { DateValidator } from '../../utils/DateValidator';
import Logger from '../../utils/Logger';

export class ReminderTools {
    private reminderRepository: ReminderRepository;

    constructor(reminderRepository: ReminderRepository) {
        this.reminderRepository = reminderRepository;
    }

    /**
     * Create a tool for creating reminders
     */
    public createReminderTool(userId: ObjectId, conversationId: ObjectId, phoneNumber: string): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'create_reminder',
            description:
                'Create a new reminder for the user. The reminder will be sent via SMS at the specified time. ' +
                'You must parse natural language dates (like "tomorrow at 3pm", "next Friday at 10am", "in 2 hours") ' +
                'into ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) before calling this tool. ' +
                'Always ensure the date is in the future.',
            schema: z.object({
                title: z.string().min(1).max(200).describe('Brief title for the reminder'),
                description: z
                    .string()
                    .max(1000)
                    .optional()
                    .describe('Optional detailed description of the reminder'),
                scheduledFor: DateValidator.futureISODateSchema.describe(
                    'ISO 8601 date string for when the reminder should be sent (must be in the future)'
                ),
            }),
            func: async ({ title, description, scheduledFor }) => {
                try {
                    Logger.info(`Creating reminder: ${title} for ${scheduledFor.toISOString()}`);

                    const reminder = new Reminder({
                        userId,
                        conversationId,
                        phoneNumber,
                        title,
                        description,
                        scheduledFor,
                        status: ReminderStatus.PENDING,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    const created = await this.reminderRepository.create(reminder);

                    return JSON.stringify({
                        success: true,
                        message: `Reminder created successfully! I'll send you a reminder "${title}" on ${scheduledFor.toLocaleString()}.`,
                        reminderId: created._id?.toString(),
                        scheduledFor: scheduledFor.toISOString(),
                    });
                } catch (error) {
                    Logger.error('Error creating reminder:', error);
                    return JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to create reminder',
                    });
                }
            },
        });
    }

    /**
     * Create a tool for listing reminders
     */
    public listRemindersTool(userId: ObjectId): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'list_reminders',
            description:
                'List all reminders for the user. You can optionally filter by status (pending, sent, cancelled).',
            schema: z.object({
                status: z
                    .enum(['pending', 'sent', 'cancelled'])
                    .optional()
                    .describe('Optional filter by reminder status'),
            }),
            func: async ({ status }) => {
                try {
                    Logger.info(`Listing reminders for user ${userId.toString()} with status: ${status || 'all'}`);

                    let reminders = await this.reminderRepository.findByUserId(userId);

                    if (status) {
                        reminders = reminders.filter((r) => r.status === status);
                    }

                    if (reminders.length === 0) {
                        return JSON.stringify({
                            success: true,
                            message: status
                                ? `You don't have any ${status} reminders.`
                                : "You don't have any reminders yet.",
                            reminders: [],
                        });
                    }

                    const reminderList = reminders.map((r) => ({
                        id: r._id?.toString(),
                        title: r.title,
                        description: r.description,
                        scheduledFor: r.scheduledFor.toISOString(),
                        status: r.status,
                        createdAt: r.createdAt.toISOString(),
                    }));

                    return JSON.stringify({
                        success: true,
                        message: `Found ${reminders.length} reminder(s).`,
                        reminders: reminderList,
                    });
                } catch (error) {
                    Logger.error('Error listing reminders:', error);
                    return JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to list reminders',
                    });
                }
            },
        });
    }

    /**
     * Create a tool for updating reminders
     */
    public updateReminderTool(userId: ObjectId): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'update_reminder',
            description:
                'Update an existing reminder. You can change the title, description, or scheduled time. ' +
                'First, list the reminders to get the reminder ID, then use this tool to update it.',
            schema: z.object({
                reminderId: z.string().describe('The ID of the reminder to update'),
                title: z.string().min(1).max(200).optional().describe('New title for the reminder'),
                description: z.string().max(1000).optional().describe('New description for the reminder'),
                scheduledFor: DateValidator.futureISODateSchema
                    .optional()
                    .describe('New ISO 8601 date string for when the reminder should be sent'),
            }),
            func: async ({ reminderId, title, description, scheduledFor }) => {
                try {
                    Logger.info(`Updating reminder: ${reminderId}`);

                    const reminderObjectId = new ObjectId(reminderId);
                    const existing = await this.reminderRepository.findById(reminderObjectId);

                    if (!existing) {
                        return JSON.stringify({
                            success: false,
                            error: 'Reminder not found.',
                        });
                    }

                    // Verify ownership
                    if (!existing.userId.equals(userId)) {
                        return JSON.stringify({
                            success: false,
                            error: 'You do not have permission to update this reminder.',
                        });
                    }

                    const updateData: Partial<Reminder> = {};
                    if (title) updateData.title = title;
                    if (description !== undefined) updateData.description = description;
                    if (scheduledFor) updateData.scheduledFor = scheduledFor;

                    const updated = await this.reminderRepository.update(reminderObjectId, updateData);

                    if (!updated) {
                        return JSON.stringify({
                            success: false,
                            error: 'Failed to update reminder.',
                        });
                    }

                    return JSON.stringify({
                        success: true,
                        message: 'Reminder updated successfully!',
                        reminder: {
                            id: updated._id?.toString(),
                            title: updated.title,
                            description: updated.description,
                            scheduledFor: updated.scheduledFor.toISOString(),
                            status: updated.status,
                        },
                    });
                } catch (error) {
                    Logger.error('Error updating reminder:', error);
                    return JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to update reminder',
                    });
                }
            },
        });
    }

    /**
     * Create a tool for deleting reminders
     */
    public deleteReminderTool(userId: ObjectId): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'delete_reminder',
            description:
                'Delete (cancel) a reminder. First, list the reminders to get the reminder ID, then use this tool to delete it.',
            schema: z.object({
                reminderId: z.string().describe('The ID of the reminder to delete'),
            }),
            func: async ({ reminderId }) => {
                try {
                    Logger.info(`Deleting reminder: ${reminderId}`);

                    const reminderObjectId = new ObjectId(reminderId);
                    const existing = await this.reminderRepository.findById(reminderObjectId);

                    if (!existing) {
                        return JSON.stringify({
                            success: false,
                            error: 'Reminder not found.',
                        });
                    }

                    // Verify ownership
                    if (!existing.userId.equals(userId)) {
                        return JSON.stringify({
                            success: false,
                            error: 'You do not have permission to delete this reminder.',
                        });
                    }

                    // Cancel instead of hard delete
                    await this.reminderRepository.cancelReminder(reminderObjectId);

                    return JSON.stringify({
                        success: true,
                        message: `Reminder "${existing.title}" has been cancelled.`,
                    });
                } catch (error) {
                    Logger.error('Error deleting reminder:', error);
                    return JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to delete reminder',
                    });
                }
            },
        });
    }

    /**
     * Get all tools for the agent
     */
    public getAllTools(
        userId: ObjectId,
        conversationId: ObjectId,
        phoneNumber: string
    ): DynamicStructuredTool[] {
        return [
            this.createReminderTool(userId, conversationId, phoneNumber),
            this.listRemindersTool(userId),
            this.updateReminderTool(userId),
            this.deleteReminderTool(userId),
        ];
    }
}
