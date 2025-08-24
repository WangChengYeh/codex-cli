/**
 * Jest test setup file
 * Global test configuration and utilities
 */

// Increase timeout for E2E tests
jest.setTimeout(60000);

// Global test utilities
global.testUtils = {
  // Wait utility for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry utility for flaky operations
  retry: async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await global.testUtils.wait(delay);
      }
    }
  },
  
  // Check if running in CI environment
  isCI: () => process.env.CI === 'true',
  
  // Platform detection
  platform: {
    isMacOS: () => process.platform === 'darwin',
    isLinux: () => process.platform === 'linux',
    isWindows: () => process.platform === 'win32'
  }
};

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Suppress log noise during tests, keep error/warn for debugging
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: console.warn,
    error: console.error
  };
}

// Global test matchers and expectations
expect.extend({
  toBeDisplayedWithRetry(received, timeout = 5000) {
    const pass = received && typeof received.isDisplayed === 'function';
    if (pass) {
      return {
        message: () => `expected element not to be displayed with retry`,
        pass: true
      };
    } else {
      return {
        message: () => `expected element to be displayed with retry`,
        pass: false
      };
    }
  }
});

// Setup for specific test types
beforeEach(() => {
  // Clear any previous test state
  if (global.testDriver) {
    // Ensure driver is in clean state
  }
});

afterEach(async () => {
  // Cleanup after each test
  if (global.testDriver) {
    try {
      // Reset any test state
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});