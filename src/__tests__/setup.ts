// Jest setup file for test environment configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/sms-reminders-test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.TWILIO_ACCOUNT_SID = 'test-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '7d';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE_PATH = './logs/test.log';
process.env.REMINDER_CHECK_INTERVAL = '* * * * *';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
