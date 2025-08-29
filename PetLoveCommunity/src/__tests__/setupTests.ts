// Jest Setup File for Pet Love Community
// Minimal global test configuration to avoid conflicts with React Native Testing Library

// Global test environment setup
global.__DEV__ = true;

// Global test environment setup (imports handled in jest.setup.js)

// Only mock AsyncStorage globally as it's needed by many components
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Suppress noisy React warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') ||
       args[0].includes('act('))
    ) {
      return;
    }
    originalError(...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('act(')
    ) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});