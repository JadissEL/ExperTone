const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'stores/**/*.ts',
    'components/**/*.tsx',
    'app/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};

module.exports = createJestConfig(config);
