import { Reminder, ReminderStatus } from '../../models/Reminder';
import { ObjectId } from 'mongodb';

describe('Reminder Model', () => {
    const validReminderData = {
        userId: new ObjectId(),
        conversationId: new ObjectId(),
        phoneNumber: '+12345678901',
        title: 'Test Reminder',
        description: 'Test Description',
        scheduledFor: new Date(Date.now() + 86400000), // Tomorrow
        status: ReminderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('Validation', () => {
        it('should create a valid reminder', () => {
            const reminder = new Reminder(validReminderData);

            expect(reminder.title).toBe('Test Reminder');
            expect(reminder.status).toBe(ReminderStatus.PENDING);
            expect(reminder.scheduledFor).toBeInstanceOf(Date);
        });

        it('should reject empty title', () => {
            const data = { ...validReminderData, title: '' };
            expect(() => new Reminder(data)).toThrow();
        });

        it('should reject invalid phone number', () => {
            const data = { ...validReminderData, phoneNumber: '1234567890' };
            expect(() => new Reminder(data)).toThrow();
        });

        it('should accept reminder without description', () => {
            const data = { ...validReminderData };
            delete data.description;

            const reminder = new Reminder(data);
            expect(reminder.description).toBeUndefined();
        });
    });

    describe('Status Methods', () => {
        it('should mark reminder as sent', () => {
            const reminder = new Reminder(validReminderData);
            reminder.markAsSent();

            expect(reminder.status).toBe(ReminderStatus.SENT);
            expect(reminder.isSent()).toBe(true);
            expect(reminder.isPending()).toBe(false);
        });

        it('should cancel reminder', () => {
            const reminder = new Reminder(validReminderData);
            reminder.cancel();

            expect(reminder.status).toBe(ReminderStatus.CANCELLED);
            expect(reminder.isCancelled()).toBe(true);
            expect(reminder.isPending()).toBe(false);
        });

        it('should check if reminder is due', () => {
            const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
            const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

            const pastReminder = new Reminder({
                ...validReminderData,
                scheduledFor: pastDate,
            });

            const futureReminder = new Reminder({
                ...validReminderData,
                scheduledFor: futureDate,
            });

            expect(pastReminder.isDue()).toBe(true);
            expect(futureReminder.isDue()).toBe(false);
        });

        it('should not be due if already sent', () => {
            const pastDate = new Date(Date.now() - 3600000);
            const reminder = new Reminder({
                ...validReminderData,
                scheduledFor: pastDate,
                status: ReminderStatus.SENT,
            });

            expect(reminder.isDue()).toBe(false);
        });
    });

    describe('Document Conversion', () => {
        it('should convert to document', () => {
            const reminder = new Reminder(validReminderData);
            const doc = reminder.toDocument();

            expect(doc.title).toBe('Test Reminder');
            expect(doc.userId).toEqual(validReminderData.userId);
        });

        it('should create from document', () => {
            const doc = {
                _id: new ObjectId(),
                ...validReminderData,
            };

            const reminder = Reminder.fromDocument(doc);

            expect(reminder._id).toEqual(doc._id);
            expect(reminder.title).toBe('Test Reminder');
        });
    });
});
