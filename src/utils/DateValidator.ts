import { z } from 'zod';

export class DateValidator {
    /**
     * Validates and parses an ISO date string
     * @param dateString - ISO 8601 date string
     * @returns Date object if valid
     * @throws Error if invalid
     */
    public static validateISODate(dateString: string): Date {
        try {
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
            }

            return date;
        } catch (error) {
            throw new Error(`Invalid ISO date string: ${dateString}`);
        }
    }

    /**
     * Validates that a date is in the future
     * @param date - Date to validate
     * @param currentTime - Current time for comparison (defaults to now)
     * @returns true if date is in the future
     */
    public static isFutureDate(date: Date, currentTime: Date = new Date()): boolean {
        return date > currentTime;
    }

    /**
     * Validates and parses an ISO date string, ensuring it's in the future
     * @param dateString - ISO 8601 date string
     * @param currentTime - Current time for comparison (defaults to now)
     * @returns Date object if valid and in the future
     * @throws Error if invalid or in the past
     */
    public static validateFutureISODate(
        dateString: string,
        currentTime: Date = new Date()
    ): Date {
        const date = this.validateISODate(dateString);

        if (!this.isFutureDate(date, currentTime)) {
            throw new Error('Reminder date must be in the future');
        }

        return date;
    }

    /**
     * Zod schema for ISO date string validation
     */
    public static get isoDateSchema(): z.ZodEffects<z.ZodString, Date, string> {
        return z.string().transform((val, ctx) => {
            try {
                return DateValidator.validateISODate(val);
            } catch (error) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: error instanceof Error ? error.message : 'Invalid date',
                });
                return z.NEVER;
            }
        });
    }

    /**
     * Zod schema for future ISO date string validation
     */
    public static get futureISODateSchema(): z.ZodEffects<z.ZodString, Date, string> {
        return z.string().transform((val, ctx) => {
            try {
                return DateValidator.validateFutureISODate(val);
            } catch (error) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: error instanceof Error ? error.message : 'Invalid future date',
                });
                return z.NEVER;
            }
        });
    }
}
