import winston from 'winston';

const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m', // Yellow
    INFO: '\x1b[32m', // Green
    DEBUG: '\x1b[34m', // Blue
    RESET: '\x1b[0m',
};

const customFormat = winston.format.printf(({ level, message, timestamp }) => {
    const upperLevel = level.toUpperCase();
    let colorCode = colors.RESET;

    if (upperLevel.includes('ERROR')) {
        colorCode = colors.ERROR;
    } else if (upperLevel.includes('WARN')) {
        colorCode = colors.WARN;
    } else if (upperLevel.includes('INFO')) {
        colorCode = colors.INFO;
    } else if (upperLevel.includes('DEBUG')) {
        colorCode = colors.DEBUG;
    }

    return `${timestamp} ${colorCode}[${upperLevel}]${colors.RESET} ${message}`;
});

class Logger {
    private logger: winston.Logger;

    constructor() {
        const logLevel = process.env.LOG_LEVEL || 'info';
        const logFilePath = process.env.LOG_FILE_PATH || './logs/app.log';

        this.logger = winston.createLogger({
            level: logLevel,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                customFormat
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        customFormat
                    ),
                }),
                new winston.transports.File({
                    filename: logFilePath,
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        winston.format.uncolorize(),
                        winston.format.printf(
                            ({ level, message, timestamp }) =>
                                `${timestamp} [${level.toUpperCase()}] ${message}`
                        )
                    ),
                }),
            ],
        });
    }

    public error(message: string, meta?: unknown): void {
        this.logger.error(message, meta);
    }

    public warn(message: string, meta?: unknown): void {
        this.logger.warn(message, meta);
    }

    public info(message: string, meta?: unknown): void {
        this.logger.info(message, meta);
    }

    public debug(message: string, meta?: unknown): void {
        this.logger.debug(message, meta);
    }
}

export default new Logger();
