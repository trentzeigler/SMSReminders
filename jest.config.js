module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/server.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 85,
            statements: 85,
        },
    },
    coverageDirectory: 'coverage',
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
