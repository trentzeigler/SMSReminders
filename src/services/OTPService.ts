import crypto from 'crypto';
import Logger from '../utils/Logger';

interface OTPData {
    otp: string;
    expiresAt: Date;
    attempts: number;
}

export class OTPService {
    private otpStore: Map<string, OTPData> = new Map();
    private readonly OTP_EXPIRY_MINUTES = 10;
    private readonly MAX_ATTEMPTS = 5;

    /**
     * Generate a 6-digit OTP
     */
    public generateOTP(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Store OTP for an email
     */
    public storeOTP(email: string, otp: string): void {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

        this.otpStore.set(email.toLowerCase(), {
            otp,
            expiresAt,
            attempts: 0,
        });

        Logger.info(`OTP generated for ${email}, expires at ${expiresAt.toISOString()}`);
    }

    /**
     * Verify OTP for an email
     */
    public verifyOTP(email: string, otp: string): { valid: boolean; error?: string } {
        const emailKey = email.toLowerCase();
        const otpData = this.otpStore.get(emailKey);

        if (!otpData) {
            return { valid: false, error: 'No verification code found. Please request a new one.' };
        }

        // Check if expired
        if (new Date() > otpData.expiresAt) {
            this.otpStore.delete(emailKey);
            return { valid: false, error: 'Verification code has expired. Please request a new one.' };
        }

        // Check max attempts
        if (otpData.attempts >= this.MAX_ATTEMPTS) {
            this.otpStore.delete(emailKey);
            return {
                valid: false,
                error: 'Too many failed attempts. Please request a new verification code.',
            };
        }

        // Verify OTP
        if (otpData.otp !== otp) {
            otpData.attempts++;
            this.otpStore.set(emailKey, otpData);
            return {
                valid: false,
                error: `Invalid verification code. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining.`,
            };
        }

        // Valid OTP - remove from store
        this.otpStore.delete(emailKey);
        Logger.info(`OTP verified successfully for ${email}`);
        return { valid: true };
    }

    /**
     * Clean up expired OTPs (run periodically)
     */
    public cleanupExpiredOTPs(): void {
        const now = new Date();
        let cleaned = 0;

        for (const [email, otpData] of this.otpStore.entries()) {
            if (now > otpData.expiresAt) {
                this.otpStore.delete(email);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            Logger.debug(`Cleaned up ${cleaned} expired OTPs`);
        }
    }

    /**
     * Start periodic cleanup
     */
    public startCleanup(): void {
        // Clean up every 5 minutes
        setInterval(() => {
            this.cleanupExpiredOTPs();
        }, 5 * 60 * 1000);

        Logger.info('OTP cleanup service started');
    }
}

export default new OTPService();
