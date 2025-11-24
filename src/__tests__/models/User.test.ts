import { User, UserSchema } from '../../models/User';
import { ObjectId } from 'mongodb';

describe('User Model', () => {
    describe('Validation', () => {
        it('should create a valid user with phone number', () => {
            const userData = {
                phoneNumber: '+12345678901',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const user = new User(userData);

            expect(user.phoneNumber).toBe('+12345678901');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('should create a valid user with email and password', () => {
            const userData = {
                phoneNumber: '+12345678901',
                email: 'test@example.com',
                passwordHash: 'hashed-password',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const user = new User(userData);

            expect(user.email).toBe('test@example.com');
            expect(user.passwordHash).toBe('hashed-password');
        });

        it('should reject invalid phone number format', () => {
            const userData = {
                phoneNumber: '1234567890', // Missing + prefix
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(() => new User(userData)).toThrow();
        });

        it('should reject invalid email format', () => {
            const userData = {
                phoneNumber: '+12345678901',
                email: 'invalid-email',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(() => new User(userData)).toThrow();
        });
    });

    describe('Methods', () => {
        it('should convert to document', () => {
            const user = new User({
                phoneNumber: '+12345678901',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const doc = user.toDocument();

            expect(doc.phoneNumber).toBe('+12345678901');
            expect(doc.email).toBe('test@example.com');
        });

        it('should create from document', () => {
            const doc = {
                _id: new ObjectId(),
                phoneNumber: '+12345678901',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const user = User.fromDocument(doc);

            expect(user._id).toEqual(doc._id);
            expect(user.phoneNumber).toBe('+12345678901');
        });

        it('should update timestamp', () => {
            const user = new User({
                phoneNumber: '+12345678901',
                createdAt: new Date(),
                updatedAt: new Date('2020-01-01'),
            });

            const oldTimestamp = user.updatedAt;
            user.updateTimestamp();

            expect(user.updatedAt.getTime()).toBeGreaterThan(oldTimestamp.getTime());
        });
    });
});
