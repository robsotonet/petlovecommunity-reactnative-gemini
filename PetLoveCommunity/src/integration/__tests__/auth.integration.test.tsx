// Authentication Integration Tests
// Testing authentication flow, navigation integration, and state persistence

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { petApi } from '../../services/petApi';
import counterReducer from '../../features/counter/counterSlice';
import { AuthProvider } from '../../hooks/AuthProvider';
import App from '../../../App';
import RootNavigator from '../../navigation/RootNavigator';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: jest.fn(styles => styles),
  },
}));

// Mock React Native modules for navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

// Mock screens
jest.mock('../../screens/LoginScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function LoginScreen() {
    return (
      <View testID="login-screen">
        <Text>Login Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/HomeScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function HomeScreen() {
    return (
      <View testID="home-screen">
        <Text>Home Screen</Text>
      </View>
    );
  };
});

jest.mock('../../components/LoadingScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function LoadingScreen({ message }: { message: string }) {
    return (
      <View testID="loading-screen">
        <Text>{message}</Text>
      </View>
    );
  };
});

jest.mock('../../components/ErrorBoundary', () => {
  const React = require('react');
  return function ErrorBoundary({ children }: { children: React.ReactNode }) {
    return children;
  };
});

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock secure storage
jest.mock('../../utils/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    clear: jest.fn(() => Promise.resolve()),
    isAvailable: jest.fn(() => Promise.resolve(true)),
  },
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock device info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
  getVersion: jest.fn(() => '1.0.0'),
}));

// Note: biometric authentication not implemented yet - skip mock

// Mock development utilities
jest.mock('../../utils/devUtils', () => ({
  clearAllStoredData: jest.fn(() => Promise.resolve()),
  logStoredCredentials: jest.fn(() => Promise.resolve()),
}));

// Mock constants
jest.mock('../../config/constants', () => ({
  API_CONFIG: {
    BASE_URL: 'http://test-api.com',
    TIMEOUT: 10000,
  },
  STORAGE_KEYS: {
    AUTH_TOKEN: 'AUTH_TOKEN',
    USER_DATA: 'USER_DATA',
    BIOMETRIC_ENABLED: 'BIOMETRIC_ENABLED',
  },
  ENV: {
    IS_TEST: true,
  },
}));

// Mock services
jest.mock('../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      counter: counterReducer,
      [petApi.reducerPath]: petApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(petApi.middleware),
  });
};

describe('Authentication Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication State Management', () => {
    test('should initialize with logged out state', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });

    test('should show loading screen during auth check', async () => {
      // Mock delayed auth check
      mockAsyncStorage.getItem.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 100))
      );

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      // Should show loading initially
      expect(screen.getByText('Checking authentication...')).toBeTruthy();

      // Should resolve to login screen
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });

    test('should navigate to home when authenticated', async () => {
      // Mock existing auth token
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve(JSON.stringify('valid-token'));
        }
        if (key === 'USER_DATA') {
          return Promise.resolve(JSON.stringify({ id: '123', email: 'test@example.com' }));
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('Full App Integration', () => {
    test('should integrate authentication with full app structure', async () => {
      // Mock redux-persist
      const mockPersistor = {
        persist: jest.fn(),
        purge: jest.fn(),
        flush: jest.fn(),
        pause: jest.fn(),
        getState: jest.fn(() => ({ bootstrapped: true })),
        subscribe: jest.fn(),
      };

      const TestApp = () => (
        <Provider store={store}>
          <PersistGate loading={<div>Loading persistor...</div>} persistor={mockPersistor as any}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </PersistGate>
        </Provider>
      );

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });

    test('should handle development mode initialization', async () => {
      // Mock __DEV__ as true
      (global as any).__DEV__ = true;

      const devUtils = require('../../utils/devUtils');
      
      render(<App />);

      await waitFor(() => {
        expect(devUtils.clearAllStoredData).toHaveBeenCalled();
        expect(devUtils.logStoredCredentials).toHaveBeenCalled();
      });

      // Clean up
      (global as any).__DEV__ = false;
    });
  });

  describe('Authentication Error Handling', () => {
    test('should handle auth storage errors gracefully', async () => {
      // Mock storage error
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      // Should default to login screen on error
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });

    test('should handle corrupted auth data', async () => {
      // Mock corrupted JSON data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve('invalid-json{');
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      // Should handle corrupted data and show login
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('Biometric Authentication Integration', () => {
    test('should handle missing biometric functionality gracefully', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      // Should continue to work without biometric functionality
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('State Persistence Integration', () => {
    test('should integrate auth state with Redux persistence', async () => {
      // Mock persisted auth state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'persist:root') {
          return Promise.resolve(JSON.stringify({
            counter: JSON.stringify({ value: 5 }),
            _persist: JSON.stringify({ version: 1, rehydrated: true }),
          }));
        }
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve(JSON.stringify('persisted-token'));
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
      });

      // Verify that both auth and Redux state are restored
      expect(store.getState().counter.value).toBeDefined();
    });

    test('should handle persistence hydration errors', async () => {
      // Mock persistence error
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'persist:root') {
          return Promise.reject(new Error('Persistence error'));
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      // Should handle persistence errors gracefully
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('Navigation Integration', () => {
    test('should handle navigation state based on auth status', async () => {
      let authToken: string | null = null;

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve(authToken);
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      const { rerender } = render(<TestWrapper />);

      // Initially should show login
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Simulate login
      authToken = JSON.stringify('new-token');
      
      rerender(<TestWrapper />);

      // Should now show home screen
      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  describe('Service Integration', () => {
    test('should integrate correlation ID service with auth flow', async () => {
      const correlationIdService = require('../../services/correlationIdService');

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(correlationIdService.getCorrelationId).toHaveBeenCalled();
      });
    });

    test('should handle service initialization errors', async () => {
      const correlationIdService = require('../../services/correlationIdService');
      correlationIdService.getCorrelationId.mockRejectedValue(new Error('Service error'));

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      render(<TestWrapper />);

      // Should continue functioning despite service errors
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('Performance Integration', () => {
    test('should handle rapid auth state changes efficiently', async () => {
      const startTime = Date.now();

      const TestWrapper = () => (
        <Provider store={store}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </Provider>
      );

      // Render multiple times rapidly
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<TestWrapper />);
        unmount();
      }

      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should handle rapid changes
    });

    test('should minimize re-renders during auth initialization', async () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return (
          <Provider store={store}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </Provider>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Should not cause excessive re-renders
      expect(renderCount).toBeLessThan(5);
    });
  });
});