import { ObjectId } from 'mongodb';
import { z } from 'zod';

export enum ReminderStatus {
    PENDING = 'pending',
    SENT = 'sent',
    CANCELLED = 'cancelled',
}

// Zod schema for validation
export const ReminderSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    userId: z.instanceof(ObjectId),
    conversationId: z.instanceof(ObjectId),
    phoneNumber: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    scheduledFor: z.date(),
    status: z.nativeEnum(ReminderStatus).default(ReminderStatus.PENDING),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
});

export type ReminderDocument = z.infer<typeof ReminderSchema>;

export interface IReminder {
    _id?: ObjectId;
    userId: ObjectId;
    conversationId: ObjectId;
    phoneNumber: string;
    title: string;
    description?: string;
    scheduledFor: Date;
    status: ReminderStatus;
    createdAt: Date;
    updatedAt: Date;
}

export class Reminder implements IReminder {
    public _id?: ObjectId;
    public userId: ObjectId;
    public conversationId: ObjectId;
    public phoneNumber: string;
    public title: string;
    public description?: string;
    public scheduledFor: Date;
    public status: ReminderStatus;
    public createdAt: Date;
    public updatedAt: Date;

    constructor(data: IReminder) {
        this._id = data._id;
        this.userId = data.userId;
        this.conversationId = data.conversationId;
        this.phoneNumber = data.phoneNumber;
        this.title = data.title;
        this.description = data.description;
        this.scheduledFor = data.scheduledFor;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;

        this.validate();
    }

    private validate(): void {
        ReminderSchema.parse(this);
    }

    public toDocument(): ReminderDocument {
        return {
            _id: this._id,
            userId: this.userId,
            conversationId: this.conversationId,
            phoneNumber: this.phoneNumber,
            title: this.title,
            description: this.description,
            scheduledFor: this.scheduledFor,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    public static fromDocument(doc: ReminderDocument): Reminder {
        return new Reminder({
            _id: doc._id,
            userId: doc.userId,
            conversationId: doc.conversationId,
            phoneNumber: doc.phoneNumber,
            title: doc.title,
            description: doc.description,
            scheduledFor: doc.scheduledFor,
            status: doc.status,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        });
    }

    public updateTimestamp(): void {
        this.updatedAt = new Date();
    }

    public markAsSent(): void {
        this.status = ReminderStatus.SENT;
        this.updateTimestamp();
    }

    public cancel(): void {
        this.status = ReminderStatus.CANCELLED;
        this.updateTimestamp();
    }

    public isPending(): boolean {
        return this.status === ReminderStatus.PENDING;
    }

    public isSent(): boolean {
        return this.status === ReminderStatus.SENT;
    }

    public isCancelled(): boolean {
        return this.status === ReminderStatus.CANCELLED;
    }

    public isDue(currentTime: Date = new Date()): boolean {
        return this.isPending() && this.scheduledFor <= currentTime;
    }
}
