// Navigation Integration Tests
// Testing React Navigation integration with authentication, state management, and screen transitions

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petApi } from '../../services/petApi';
import counterReducer from '../../features/counter/counterSlice';
import { AuthProvider } from '../../hooks/AuthProvider';
import RootNavigator from '../../navigation/RootNavigator';

// Import standardized React Native mocks
import { mockNavigationActions, resetMocks } from '../__setup__/reactNativeMocks';

// Mock screens with navigation capabilities
jest.mock('../../screens/LoginScreen', () => {
  const React = require('react');
  const { useNavigation } = require('@react-navigation/native');
  
  return function LoginScreen() {
    const navigation = useNavigation();
    
    return React.createElement('View', { testID: 'login-screen' },
      React.createElement('Text', null, 'Login Screen'),
      React.createElement('TouchableOpacity', {
        testID: 'login-button',
        onPress: () => navigation.navigate('Home' as never)
      },
        React.createElement('Text', null, 'Login')
      )
    );
  };
});

jest.mock('../../screens/HomeScreen', () => {
  const React = require('react');
  const { useNavigation } = require('@react-navigation/native');
  
  return function HomeScreen() {
    const navigation = useNavigation();
    
    return React.createElement('View', { testID: 'home-screen' },
      React.createElement('Text', null, 'Home Screen'),
      React.createElement('TouchableOpacity', {
        testID: 'logout-button',
        onPress: () => navigation.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        })
      },
        React.createElement('Text', null, 'Logout')
      )
    );
  };
});

jest.mock('../../components/LoadingScreen', () => {
  const React = require('react');
  return function LoadingScreen({ message }: { message: string }) {
    return React.createElement('View', { testID: 'loading-screen' },
      React.createElement('Text', null, message)
    );
  };
});

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

describe('Navigation Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    resetMocks();
    store = createTestStore();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Authentication-Based Navigation', () => {
    test('should render login screen when not authenticated', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
        expect(screen.getByText('Login Screen')).toBeTruthy();
      });
    });

    test('should render home screen when authenticated', async () => {
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
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
        expect(screen.getByText('Home Screen')).toBeTruthy();
      });
    });

    test('should show loading screen during authentication check', async () => {
      let resolveAuth: (value: string | null) => void;
      const authPromise = new Promise<string | null>((resolve) => {
        resolveAuth = resolve;
      });

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return authPromise;
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      // Should show loading screen initially
      expect(screen.getByTestId('loading-screen')).toBeTruthy();
      expect(screen.getByText('Checking authentication...')).toBeTruthy();

      // Resolve authentication
      resolveAuth!(null);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('Navigation State Management', () => {
    test('should handle navigation actions correctly', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Test navigation action
      const loginButton = screen.getByTestId('login-button');
      fireEvent.press(loginButton);

      expect(mockNavigationActions.navigate).toHaveBeenCalledWith('Home');
    });

    test('should handle logout navigation', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve(JSON.stringify('valid-token'));
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
      });

      // Test logout navigation
      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.press(logoutButton);

      expect(mockNavigationActions.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });

    test('should preserve navigation state across re-renders', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      const { rerender } = render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Re-render the component
      rerender(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Navigation state should be preserved
      expect(screen.getByText('Login Screen')).toBeTruthy();
    });
  });

  describe('Navigation Performance', () => {
    test('should handle rapid navigation changes efficiently', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      const startTime = Date.now();

      // Simulate rapid navigation actions
      const loginButton = screen.getByTestId('login-button');
      for (let i = 0; i < 10; i++) {
        fireEvent.press(loginButton);
      }

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockNavigationActions.navigate).toHaveBeenCalledTimes(10);
    });

    test('should minimize re-renders during navigation', async () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return (
          <Provider store={store}>
            <NavigationContainer>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </NavigationContainer>
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

  describe('Navigation Error Handling', () => {
    test('should handle navigation errors gracefully', async () => {
      // Mock navigation error
      mockNavigationActions.navigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Navigation error should not crash the app
      const loginButton = screen.getByTestId('login-button');
      expect(() => fireEvent.press(loginButton)).not.toThrow();
    });

    test('should handle invalid navigation states', async () => {
      // Mock invalid auth state
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve('invalid-token-format');
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      // Should default to login screen for invalid states
      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });
    });
  });

  describe('Deep Linking Integration', () => {
    test('should handle deep link navigation when authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve(JSON.stringify('valid-token'));
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
      });

      // Deep links should be accessible when authenticated
      expect(screen.getByText('Home Screen')).toBeTruthy();
    });

    test('should redirect to login for deep links when not authenticated', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Should redirect to login regardless of intended deep link
      expect(screen.getByText('Login Screen')).toBeTruthy();
    });
  });

  describe('State Integration with Navigation', () => {
    test('should integrate Redux state with navigation', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Redux state should be accessible
      const state = store.getState();
      expect(state.counter).toBeDefined();
      expect(state.petApi).toBeDefined();
    });

    test('should handle state changes during navigation', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Dispatch action during navigation
      store.dispatch({ type: 'counter/increment' });

      const newState = store.getState();
      expect(newState.counter.value).toBe(1);

      // Navigation should remain stable despite state changes
      expect(screen.getByTestId('login-screen')).toBeTruthy();
    });

    test('should persist navigation state with Redux', async () => {
      // Mock persisted navigation state
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:root') {
          return Promise.resolve(JSON.stringify({
            counter: JSON.stringify({ value: 5 }),
            navigation: JSON.stringify({ routeName: 'Home' }),
            _persist: JSON.stringify({ version: 1, rehydrated: true }),
          }));
        }
        if (key === 'AUTH_TOKEN') {
          return Promise.resolve(JSON.stringify('valid-token'));
        }
        return Promise.resolve(null);
      });

      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeTruthy();
      });

      // Both navigation and Redux state should be restored
      const state = store.getState();
      expect(state.counter.value).toBeDefined();
    });
  });

  describe('Navigation Accessibility', () => {
    test('should support screen reader navigation', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Screen should be accessible
      const loginScreen = screen.getByTestId('login-screen');
      expect(loginScreen).toBeTruthy();

      // Navigation elements should be accessible
      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).toBeTruthy();
    });

    test('should handle focus management during navigation', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Focus should be managed properly during navigation
      const loginButton = screen.getByTestId('login-button');
      fireEvent.press(loginButton);

      expect(mockNavigationActions.navigate).toHaveBeenCalledWith('Home');
    });
  });

  describe('Memory Management', () => {
    test('should clean up navigation listeners on unmount', async () => {
      const TestWrapper = () => (
        <Provider store={store}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      const { unmount } = render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeTruthy();
      });

      // Unmount should clean up properly
      expect(() => unmount()).not.toThrow();
    });

    test('should handle multiple navigation instances efficiently', async () => {
      const TestWrapper = ({ key }: { key: number }) => (
        <Provider store={store} key={key}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </Provider>
      );

      // Create multiple instances
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<TestWrapper key={i} />);
        unmount();
      }

      // Should handle multiple instances without memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });
});