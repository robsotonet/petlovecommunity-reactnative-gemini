// useAuth Hook Comprehensive Tests
// Testing authentication hook with state management, async operations, and AuthService integration

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import authService from '../../services/authService';

// Mock the authService
jest.mock('../../services/authService', () => ({
  getCredentials: jest.fn(),
  setCredentials: jest.fn(),
  resetCredentials: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and State Management', () => {
    test('should initialize with isLoggedIn as false', () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      
      const { result } = renderHook(() => useAuth());
      
      // Initial state should be false before credentials check
      expect(result.current.isLoggedIn).toBe(false);
    });

    test('should set isLoggedIn to true when credentials exist on mount', async () => {
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockAuthService.getCredentials.mockResolvedValueOnce(mockCredentials);
      
      const { result } = renderHook(() => useAuth());
      
      // Wait for useEffect to complete
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
      });
      
      expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
    });

    test('should set isLoggedIn to false when no credentials exist on mount', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
    });

    test('should handle null credentials gracefully', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(null);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
    });

    test('should handle undefined credentials gracefully', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
    });
  });

  describe('Login Functionality', () => {
    test('should call authService.setCredentials and update state on login', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Perform login
      await act(async () => {
        await result.current.login('testuser', 'token123');
      });
      
      expect(mockAuthService.setCredentials).toHaveBeenCalledWith('testuser', 'token123');
      expect(result.current.isLoggedIn).toBe(true);
    });

    test('should handle login with empty strings', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      await act(async () => {
        await result.current.login('', '');
      });
      
      expect(mockAuthService.setCredentials).toHaveBeenCalledWith('', '');
      expect(result.current.isLoggedIn).toBe(true);
    });

    test('should handle login errors gracefully', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockRejectedValueOnce(new Error('Keychain error'));
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Login should throw error, but hook should remain stable
      await expect(
        act(async () => {
          await result.current.login('testuser', 'token123');
        })
      ).rejects.toThrow('Keychain error');
      
      // State should remain false if login failed
      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe('Logout Functionality', () => {
    test('should call authService.resetCredentials and update state on logout', async () => {
      // Start with logged in state
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockAuthService.getCredentials.mockResolvedValueOnce(mockCredentials);
      mockAuthService.resetCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      // Wait for initial logged in state
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
      });
      
      // Perform logout
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
      expect(result.current.isLoggedIn).toBe(false);
    });

    test('should handle logout from logged out state', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.resetCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Logout from already logged out state
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
      expect(result.current.isLoggedIn).toBe(false);
    });

    test('should handle logout errors gracefully', async () => {
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockAuthService.getCredentials.mockResolvedValueOnce(mockCredentials);
      mockAuthService.resetCredentials.mockRejectedValueOnce(new Error('Keychain reset error'));
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
      });
      
      // Logout should throw error, but hook should remain stable
      await expect(
        act(async () => {
          await result.current.logout();
        })
      ).rejects.toThrow('Keychain reset error');
      
      // State should remain true if logout failed
      expect(result.current.isLoggedIn).toBe(true);
    });
  });

  describe('Hook Interface and Return Values', () => {
    test('should return correct interface with all required properties', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current).toHaveProperty('isLoggedIn');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      
      expect(typeof result.current.isLoggedIn).toBe('boolean');
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });

    test('should provide functions that work consistently across rerenders', async () => {
      mockAuthService.getCredentials.mockResolvedValue(false);
      mockAuthService.setCredentials.mockResolvedValue(undefined);
      
      const { result, rerender } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Functions should work consistently even after rerenders
      rerender();
      
      await act(async () => {
        await result.current.login('testuser', 'token123');
      });
      
      expect(result.current.isLoggedIn).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete authentication flow', async () => {
      // Start logged out
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockResolvedValueOnce(undefined);
      mockAuthService.resetCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      // Initially logged out
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Login
      await act(async () => {
        await result.current.login('testuser', 'token123');
      });
      expect(result.current.isLoggedIn).toBe(true);
      
      // Logout
      await act(async () => {
        await result.current.logout();
      });
      expect(result.current.isLoggedIn).toBe(false);
      
      // Verify all service calls
      expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
      expect(mockAuthService.setCredentials).toHaveBeenCalledWith('testuser', 'token123');
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple rapid login/logout operations', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockResolvedValue(undefined);
      mockAuthService.resetCredentials.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Rapid operations
      await act(async () => {
        await result.current.login('user1', 'token1');
        await result.current.logout();
        await result.current.login('user2', 'token2');
        await result.current.logout();
      });
      
      expect(result.current.isLoggedIn).toBe(false);
      expect(mockAuthService.setCredentials).toHaveBeenCalledTimes(2);
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(2);
    });

    test('should handle sequential async operations correctly', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockResolvedValue(undefined);
      mockAuthService.resetCredentials.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      // Perform operations sequentially to avoid overlapping act() calls
      await act(async () => {
        await result.current.login('testuser', 'token123');
      });
      
      expect(result.current.isLoggedIn).toBe(true);
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(result.current.isLoggedIn).toBe(false);
      
      // Verify service calls
      expect(mockAuthService.setCredentials).toHaveBeenCalledWith('testuser', 'token123');
      expect(mockAuthService.resetCredentials).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle authService.getCredentials throwing an error', async () => {
      mockAuthService.getCredentials.mockRejectedValueOnce(new Error('Service unavailable'));
      
      const { result } = renderHook(() => useAuth());
      
      // Hook should remain stable even if initial credential check fails
      await waitFor(() => {
        // State should remain false if credential check fails
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
    });

    test('should handle very long username and token values', async () => {
      mockAuthService.getCredentials.mockResolvedValueOnce(false);
      mockAuthService.setCredentials.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(false);
      });
      
      const longUsername = 'a'.repeat(1000);
      const longToken = 'b'.repeat(1000);
      
      await act(async () => {
        await result.current.login(longUsername, longToken);
      });
      
      expect(mockAuthService.setCredentials).toHaveBeenCalledWith(longUsername, longToken);
      expect(result.current.isLoggedIn).toBe(true);
    });
  });
});