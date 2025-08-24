module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.{js}',
    '**/?(*.)+(spec|test).{js}'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/vendor/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'html',
    'lcov'
  ],
  testTimeout: 30000, // 30 seconds for E2E tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleFileExtensions: ['js', 'json'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/target/',
    '<rootDir>/dist/',
    '<rootDir>/src-tauri/'
  ],
  // No transforms needed for pure JavaScript
  transform: {},
  // Clear mocks between tests
  clearMocks: true
};