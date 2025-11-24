import { Request, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../models/User';
import { PasswordHelper } from '../utils/PasswordHelper';
import { AuthMiddleware, AuthRequest } from '../middleware/AuthMiddleware';
import { TwilioService } from '../services/TwilioService';
import OTPService from '../services/OTPService';
import Logger from '../utils/Logger';

export class AuthController {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    /**
     * User signup
     */
    public signup = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password, phoneNumber } = req.body as {
                email: string;
                password: string;
                phoneNumber?: string;
            };

            // Validate required fields
            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }

            // Validate password strength
            const passwordValidation = PasswordHelper.validateStrength(password);
            if (!passwordValidation.isValid) {
                res.status(400).json({ error: passwordValidation.errors.join(', ') });
                return;
            }

            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(email);
            if (existingUser) {
                res.status(409).json({ error: 'User with this email already exists' });
                return;
            }

            // Format phone number if provided
            let formattedPhone: string | undefined;
            if (phoneNumber) {
                try {
                    formattedPhone = TwilioService.formatPhoneNumber(phoneNumber);
                } catch (error) {
                    res.status(400).json({ error: 'Invalid phone number format' });
                    return;
                }
            }

            // Hash password
            const passwordHash = await PasswordHelper.hash(password);

            // Create user
            const user = new User({
                email,
                passwordHash,
                phoneNumber: formattedPhone,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const created = await this.userRepository.create(user);

            // Generate JWT token
            const token = AuthMiddleware.generateToken({
                userId: created._id!.toString(),
                email: created.email,
                phoneNumber: created.phoneNumber,
            });

            Logger.info(`User signed up: ${email}`);

            res.status(201).json({
                message: 'User created successfully',
                token,
                user: {
                    id: created._id!.toString(),
                    email: created.email,
                    phoneNumber: created.phoneNumber,
                },
            });
        } catch (error) {
            Logger.error('Signup error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    };

    /**
     * User login
     */
    public login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body as {
                email: string;
                password: string;
            };

            // Validate required fields
            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }

            // Find user by email
            const user = await this.userRepository.findByEmail(email);
            if (!user || !user.passwordHash) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }

            // Verify password
            const isValid = await PasswordHelper.compare(password, user.passwordHash);
            if (!isValid) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }

            // Generate JWT token
            const token = AuthMiddleware.generateToken({
                userId: user._id!.toString(),
                email: user.email,
                phoneNumber: user.phoneNumber,
            });

            Logger.info(`User logged in: ${email}`);

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user._id!.toString(),
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                },
            });
        } catch (error) {
            Logger.error('Login error:', error);
            res.status(500).json({ error: 'Failed to login' });
        }
    };

    /**
     * Get current user
     */
    public me = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const user = await this.userRepository.findById(req.user.userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({
                user: {
                    id: user._id!.toString(),
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            Logger.error('Get user error:', error);
            res.status(500).json({ error: 'Failed to get user' });
        }
    };

    /**
     * Logout (client-side token removal, no server-side action needed)
     */
    public logout = async (_req: Request, res: Response): Promise<void> => {
        res.json({ message: 'Logout successful' });
    };

    /**
     * Request password reset OTP
     */
    public forgotPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.body as { email: string };

            // Validate required fields
            if (!email) {
                res.status(400).json({ error: 'Email is required' });
                return;
            }

            // Check if user exists
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                // Don't reveal if user exists or not for security
                res.json({ message: 'If an account exists, a verification code has been sent' });
                return;
            }

            // Check if user has a phone number
            if (!user.phoneNumber) {
                res.status(400).json({
                    error: 'No phone number associated with this account. Please contact support.'
                });
                return;
            }

            // Generate OTP
            const otp = OTPService.generateOTP();
            OTPService.storeOTP(email, otp);

            // Send OTP via SMS
            const twilioService = new TwilioService();
            const message = `Your SMS Reminders password reset code is: ${otp}\n\nThis code expires in 10 minutes.`;

            await twilioService.sendSMS(user.phoneNumber, message);

            Logger.info(`Password reset OTP sent via SMS to ${user.phoneNumber} for ${email}`);

            res.json({
                message: 'Verification code sent to your phone number',
                phoneNumber: user.phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1***-***-$4') // Mask phone number
            });
        } catch (error) {
            Logger.error('Forgot password error:', error);
            res.status(500).json({ error: 'Failed to send verification code' });
        }
    };

    /**
     * Reset password with OTP
     */
    public resetPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, otp, newPassword } = req.body as {
                email: string;
                otp: string;
                newPassword: string;
            };

            // Validate required fields
            if (!email || !otp || !newPassword) {
                res.status(400).json({ error: 'Email, OTP, and new password are required' });
                return;
            }

            // Verify OTP
            const otpVerification = OTPService.verifyOTP(email, otp);
            if (!otpVerification.valid) {
                res.status(400).json({ error: otpVerification.error });
                return;
            }

            // Validate password strength
            const passwordValidation = PasswordHelper.validateStrength(newPassword);
            if (!passwordValidation.isValid) {
                res.status(400).json({ error: passwordValidation.errors.join(', ') });
                return;
            }

            // Find user
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Hash new password
            const passwordHash = await PasswordHelper.hash(newPassword);

            // Update user password
            user.passwordHash = passwordHash;
            user.updateTimestamp();
            await this.userRepository.update(user._id!, user);

            Logger.info(`Password reset successful for ${email}`);

            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            Logger.error('Reset password error:', error);
            res.status(500).json({ error: 'Failed to reset password' });
        }
    };
}
