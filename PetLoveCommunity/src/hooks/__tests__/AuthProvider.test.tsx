// AuthProvider Comprehensive React Context Tests  
// Testing authentication provider integration, state management, and component integration

import React from 'react';
import { renderHook, render, waitFor, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../AuthProvider';
import authService from '../../services/authService';
import authApi from '../../services/authApi';

// Mock authService
jest.mock('../../services/authService', () => ({
  getCredentials: jest.fn(),
  setCredentials: jest.fn(),
  resetCredentials: jest.fn(),
}));

// Mock authApi
jest.mock('../../services/authApi', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test component that uses the AuthProvider context
const TestConsumer: React.FC<{ testId?: string }> = ({ testId = 'test-consumer' }) => {
  const { isLoggedIn, isLoading, login, logout } = useAuth();
  
  return (
    <View testID={testId}>
      <Text testID={`${testId}-logged-in`}>{isLoggedIn ? 'true' : 'false'}</Text>
      <Text testID={`${testId}-loading`}>{isLoading ? 'true' : 'false'}</Text>
      <Text testID={`${testId}-login-function`}>{typeof login}</Text>
      <Text testID={`${testId}-logout-function`}>{typeof logout}</Text>
    </View>
  );
};

// Test component for multiple consumers
const MultipleConsumers: React.FC = () => (
  <View testID="multiple-consumers">
    <TestConsumer testId="consumer-1" />
    <TestConsumer testId="consumer-2" />
  </View>
);

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default successful mock behavior
    mockAuthApi.validateToken.mockResolvedValue(true);
    mockAuthApi.login.mockResolvedValue({
      success: true,
      token: 'mock-auth-token',
      user: { id: '1', username: 'testuser', email: 'test@test.com', displayName: 'Test User' },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    mockAuthApi.logout.mockResolvedValue(undefined);
  });

  describe('Provider Setup and Context', () => {
    test('should provide authentication context to child components', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);

      const { getByTestId } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('test-consumer-loading').children[0]).toBe('false');
      });

      expect(getByTestId('test-consumer-logged-in').children[0]).toBe('false');
      expect(getByTestId('test-consumer-login-function').children[0]).toBe('function');
      expect(getByTestId('test-consumer-logout-function').children[0]).toBe('function');
    });

    test('should handle multiple consumers with shared state', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);

      const { getByTestId } = render(
        <AuthProvider>
          <MultipleConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('consumer-1-loading').children[0]).toBe('false');
        expect(getByTestId('consumer-2-loading').children[0]).toBe('false');
      });

      // Both consumers should have the same state
      expect(getByTestId('consumer-1-logged-in').children[0]).toBe('false');
      expect(getByTestId('consumer-2-logged-in').children[0]).toBe('false');
    });

    test('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Authentication State Management', () => {
    test('should initialize with loading state and then set logged out', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Initially loading should be true
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoggedIn).toBe(false);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoggedIn).toBe(false);
    });

    test('should initialize as logged in when valid credentials exist', async () => {
      const mockCredentials = { username: 'testuser', password: 'valid-token' };
      mockAuthService.getCredentials.mockResolvedValue(mockCredentials);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
      expect(mockAuthApi.validateToken).toHaveBeenCalledWith('valid-token');
    });

    test('should handle invalid token by clearing credentials and setting logged out', async () => {
      const mockCredentials = { username: 'testuser', password: 'invalid-token' };
      mockAuthService.getCredentials.mockResolvedValue(mockCredentials);
      mockAuthApi.validateToken.mockResolvedValue(false);
      mockAuthService.resetCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockAuthApi.validateToken).toHaveBeenCalledWith('invalid-token');
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login Flow Integration', () => {
    test('should handle successful login flow', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);
      mockAuthService.setCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoggedIn).toBe(false);

      // Perform login
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isLoggedIn).toBe(true);
      expect(mockAuthApi.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password123' });
      expect(mockAuthService.setCredentials).toHaveBeenCalledWith('testuser', 'mock-auth-token');
    });

    test('should handle login validation errors', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try login with invalid credentials
      await expect(
        act(async () => {
          await result.current.login('', '');
        })
      ).rejects.toThrow('Username and password are required');

      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthService.setCredentials).not.toHaveBeenCalled();
    });

    test('should handle API login failure', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);
      mockAuthApi.login.mockResolvedValue({ success: false, token: '', expiresAt: '' });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('testuser', 'wrongpass');
        })
      ).rejects.toThrow('Authentication failed');

      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthService.setCredentials).not.toHaveBeenCalled();
    });
  });

  describe('Logout Flow Integration', () => {
    test('should handle successful logout flow', async () => {
      // Start with logged in state
      const mockCredentials = { username: 'testuser', password: 'valid-token' };
      mockAuthService.getCredentials.mockResolvedValue(mockCredentials);
      mockAuthService.resetCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for logged in state
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
      });

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthApi.logout).toHaveBeenCalledWith('valid-token');
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });

    test('should handle logout when already logged out', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);
      mockAuthService.resetCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoggedIn).toBe(false);

      // Logout from already logged out state
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });

    test('should handle server logout failure gracefully', async () => {
      const mockCredentials = { username: 'testuser', password: 'valid-token' };
      mockAuthService.getCredentials.mockResolvedValue(mockCredentials);
      mockAuthApi.logout.mockRejectedValue(new Error('Server unavailable'));
      mockAuthService.resetCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
      });

      // Logout should succeed locally even if server fails
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Persistence and Synchronization', () => {
    test('should share state updates across multiple consumers', async () => {
      // Start with logged in state to test state sharing
      const mockCredentials = { username: 'testuser', password: 'valid-token' };
      mockAuthService.getCredentials.mockResolvedValue(mockCredentials);

      const { getByTestId } = render(
        <AuthProvider>
          <MultipleConsumers />
        </AuthProvider>
      );

      // Wait for initialization and both consumers should be logged in
      await waitFor(() => {
        expect(getByTestId('consumer-1-loading').children[0]).toBe('false');
        expect(getByTestId('consumer-2-loading').children[0]).toBe('false');
        expect(getByTestId('consumer-1-logged-in').children[0]).toBe('true');
        expect(getByTestId('consumer-2-logged-in').children[0]).toBe('true');
      });
    });

    test('should handle re-renders without losing authentication state', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);
      mockAuthService.setCredentials.mockResolvedValue(undefined);

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isLoggedIn).toBe(true);

      // Force re-render
      rerender();

      // State should persist
      expect(result.current.isLoggedIn).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle initialization errors gracefully', async () => {
      mockAuthService.getCredentials.mockRejectedValue(new Error('Storage unavailable'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should default to logged out state on error
      expect(result.current.isLoggedIn).toBe(false);
    });

    test('should handle token validation network errors', async () => {
      const mockCredentials = { username: 'testuser', password: 'token' };
      mockAuthService.getCredentials.mockResolvedValue(mockCredentials);
      mockAuthApi.validateToken.mockRejectedValue(new Error('Network error'));
      mockAuthService.resetCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should clear credentials and set logged out on validation error
      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });

    test('should handle credential storage errors during login', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);
      mockAuthService.setCredentials.mockRejectedValue(new Error('Storage full'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('testuser', 'password123');
        })
      ).rejects.toThrow('Storage full');

      // State should remain logged out
      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe('Provider Props and Configuration', () => {
    test('should render children properly', () => {
      const TestChild = () => <Text testID="child">Test Child</Text>;

      const { getByTestId } = render(
        <AuthProvider>
          <TestChild />
        </AuthProvider>
      );

      expect(getByTestId('child')).toBeTruthy();
      expect(getByTestId('child').children[0]).toBe('Test Child');
    });

    test('should handle empty children', () => {
      expect(() => {
        render(<AuthProvider>{null}</AuthProvider>);
      }).not.toThrow();
    });

    test('should handle multiple child components', () => {
      const { getByTestId } = render(
        <AuthProvider>
          <Text testID="child-1">Child 1</Text>
          <Text testID="child-2">Child 2</Text>
        </AuthProvider>
      );

      expect(getByTestId('child-1')).toBeTruthy();
      expect(getByTestId('child-2')).toBeTruthy();
    });
  });
});