import { ObjectId } from 'mongodb';
import { z } from 'zod';

// Zod schema for validation
export const UserSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    phoneNumber: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format')
        .optional(),
    email: z.string().email().optional(),
    passwordHash: z.string().optional(),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    metadata: z.record(z.unknown()).optional().nullable(),
});

export type UserDocument = z.infer<typeof UserSchema>;

export interface IUser {
    _id?: ObjectId;
    phoneNumber?: string;
    email?: string;
    passwordHash?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown> | null;
}

export class User implements IUser {
    public _id?: ObjectId;
    public phoneNumber?: string;
    public email?: string;
    public passwordHash?: string;
    public createdAt: Date;
    public updatedAt: Date;
    public metadata?: Record<string, unknown> | null;

    constructor(data: IUser) {
        this._id = data._id;
        this.phoneNumber = data.phoneNumber;
        this.email = data.email;
        this.passwordHash = data.passwordHash;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.metadata = data.metadata;

        this.validate();
    }

    private validate(): void {
        UserSchema.parse(this);
    }

    public toDocument(): UserDocument {
        return {
            _id: this._id,
            phoneNumber: this.phoneNumber,
            email: this.email,
            passwordHash: this.passwordHash,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata,
        };
    }

    public static fromDocument(doc: UserDocument): User {
        return new User({
            _id: doc._id,
            phoneNumber: doc.phoneNumber,
            email: doc.email,
            passwordHash: doc.passwordHash,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            metadata: doc.metadata,
        });
    }

    public updateTimestamp(): void {
        this.updatedAt = new Date();
    }
}
