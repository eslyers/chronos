const nextJest = require('next/jest')
 
const createJestConfig = nextJest({
  dir: './',
})
 
const customJestConfig = {
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/src/**/__tests__/**/*.[jt]s?(x)',
    '**/src/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.agents/',
    '/.next/',
  ],
}
 
module.exports = createJestConfig(customJestConfig)
