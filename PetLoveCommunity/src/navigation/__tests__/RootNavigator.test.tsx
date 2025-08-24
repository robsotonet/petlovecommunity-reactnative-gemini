import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from '../RootNavigator';
import { AuthProvider } from '../../hooks/AuthProvider';
import { store } from '../../store';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: jest.fn(styles => styles),
  },
  useColorScheme: jest.fn(() => 'light'),
  View: 'View',
  Text: 'Text',
  ActivityIndicator: 'ActivityIndicator',
  TouchableOpacity: 'TouchableOpacity',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock secure storage
jest.mock('../../utils/secureStorage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock services
jest.mock('../../services/correlationIdService', () => ({
  getCorrelationId: jest.fn(() => Promise.resolve('test-correlation-id')),
}));

jest.mock('../../transactions/transactionService', () => ({
  generateTransactionId: jest.fn(() => 'test-transaction-id'),
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
}));

// Mock constants
jest.mock('../../config/constants', () => ({
  STORAGE_KEYS: {
    AUTH_TOKEN: 'AUTH_TOKEN',
    USER_DATA: 'USER_DATA',
  },
  COLORS: {
    PRIMARY: '#FF6B6B',
    SECONDARY: '#4ECDC4',
    BACKGROUND: '#F7FFF7',
    TEXT: '#1A535C',
  },
}));

// Mock useColors hook
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(() => ({
    primary: { coral: '#FF6B6B' },
    secondary: { teal: '#4ECDC4' },
    neutral: { beige: '#F7FFF7', midnight: '#1A535C' },
  })),
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

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders without crashing', async () => {
    const TestWrapper = () => (
      <Provider store={store}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </Provider>
    );

    render(<TestWrapper />);
  });

  it('shows login screen when not authenticated', async () => {
    const TestWrapper = () => (
      <Provider store={store}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </Provider>
    );

    render(<TestWrapper />);
  });

  it('shows home screen when authenticated', async () => {
    // Mock authenticated state
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
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
  });
});
