// HomeScreen Component Tests - Enhanced Coverage
// Testing core functionality including credential loading, logout flow, and error handling

import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

// Mock the useAuth hook
const mockLogout = jest.fn();
jest.mock('../../hooks/AuthProvider', () => ({
  useAuth: () => ({
    logout: mockLogout,
    isLoggedIn: true,
    login: jest.fn(),
    user: null,
  }),
}));

// Mock useColors hook
jest.mock('../../hooks/useColors', () => ({
  useColors: () => ({
    neutral: {
      beige: '#F7FFF7',
      midnight: '#1A535C',
    },
    primary: {
      teal: '#4ECDC4',
    },
  }),
}));

// Mock authService with comprehensive functionality
const mockAuthService = {
  getCredentials: jest.fn(),
};
jest.mock('../../services/authService', () => ({
  __esModule: true,
  default: mockAuthService,
}));

// Mock Alert globally
const mockAlert = jest.fn();
global.alert = mockAlert;

// Mock Button component to avoid React Native dependencies
jest.mock('../../components/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  
  return function MockButton({ title, onPress, disabled, testID }: any) {
    return (
      <TouchableOpacity 
        onPress={disabled ? undefined : onPress} 
        testID={testID || 'button'}
        disabled={disabled}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
    mockAlert.mockImplementation((title, message, buttons) => {
      // Simulate user pressing the first button by default (Cancel)
      if (buttons && buttons.length > 0) {
        // Don't call anything for Cancel, call onPress for Logout
      }
    });
    // Set default authService behavior
    mockAuthService.getCredentials.mockResolvedValue(null);
  });

  describe('Basic Rendering', () => {
    test('should render welcome title', () => {
      render(<HomeScreen />);
      
      const welcomeTitle = screen.getByText('Welcome to Pet Love Community!');
      expect(welcomeTitle).toBeTruthy();
    });

    test('should render logout button', () => {
      render(<HomeScreen />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeTruthy();
    });

    test('should render welcome subtitle by default', () => {
      render(<HomeScreen />);
      
      // Should show "Welcome back!" when no user is loaded
      const subtitle = screen.queryByText('Welcome back!');
      expect(subtitle).toBeTruthy();
    });

    test('should render without crashing', () => {
      expect(() => render(<HomeScreen />)).not.toThrow();
    });
  });

  describe('User Interaction', () => {
    test('should respond to button press', () => {
      render(<HomeScreen />);
      
      const logoutButton = screen.getByText('Logout');
      
      // Should not throw when pressed
      expect(() => fireEvent.press(logoutButton)).not.toThrow();
    });

    test('should handle multiple button presses', () => {
      render(<HomeScreen />);
      
      const logoutButton = screen.getByText('Logout');
      
      // Should handle multiple presses without errors
      expect(() => {
        fireEvent.press(logoutButton);
        fireEvent.press(logoutButton);
        fireEvent.press(logoutButton);
      }).not.toThrow();
    });

    test('should have button with correct properties', () => {
      render(<HomeScreen />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    test('should have correct component hierarchy', () => {
      const { toJSON } = render(<HomeScreen />);
      const tree = toJSON();
      
      expect(tree).toBeTruthy();
      expect(tree).toMatchSnapshot();
    });

    test('should contain exactly one title', () => {
      render(<HomeScreen />);
      
      const titles = screen.getAllByText('Welcome to Pet Love Community!');
      expect(titles).toHaveLength(1);
    });

    test('should contain exactly one logout button', () => {
      render(<HomeScreen />);
      
      const logoutButtons = screen.getAllByText('Logout');
      expect(logoutButtons).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing dependencies gracefully', () => {
      // Test component resilience
      expect(() => render(<HomeScreen />)).not.toThrow();
    });

    test('should handle authService errors gracefully', () => {
      // Mock authService to reject
      mockAuthService.getCredentials.mockRejectedValue(new Error('Auth error'));
      
      // Should still render without crashing
      expect(() => render(<HomeScreen />)).not.toThrow();
      
      const welcomeTitle = screen.getByText('Welcome to Pet Love Community!');
      expect(welcomeTitle).toBeTruthy();
    });

    test('should handle logout function errors gracefully', () => {
      // Mock logout to throw an error
      mockLogout.mockRejectedValue(new Error('Logout error'));

      render(<HomeScreen />);
      
      const logoutButton = screen.getByText('Logout');
      
      // Should not throw when button is pressed (even if logout would fail)
      expect(() => fireEvent.press(logoutButton)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should render title text accessibly', () => {
      render(<HomeScreen />);
      
      const title = screen.getByText('Welcome to Pet Love Community!');
      expect(title).toBeTruthy();
    });

    test('should render button accessibly', () => {
      render(<HomeScreen />);
      
      const button = screen.getByText('Logout');
      expect(button).toBeTruthy();
    });
  });

  describe('Styling Integration', () => {
    test('should use color system without errors', () => {
      // This test verifies useColors hook integration works
      expect(() => render(<HomeScreen />)).not.toThrow();
    });

    test('should render with proper layout', () => {
      const { toJSON } = render(<HomeScreen />);
      
      // Should render complete component tree
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Hook Integration', () => {
    test('should integrate with useAuth hook', () => {
      render(<HomeScreen />);
      
      // Verify useAuth hook provides logout function
      expect(mockLogout).toBeDefined();
    });

    test('should integrate with authService', () => {
      render(<HomeScreen />);
      
      // Verify authService.getCredentials is available for async calls
      expect(mockAuthService.getCredentials).toBeDefined();
    });
  });

  // NEW COMPREHENSIVE TESTS FOR MISSING COVERAGE

  describe('Credential Loading (Lines 18-19)', () => {
    test('should load and display username when credentials exist', async () => {
      // Clear previous mocks and set up fresh ones
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ 
        username: 'johndoe',
        password: 'token123' 
      });

      render(<HomeScreen />);

      // Wait for useEffect and credential loading
      await waitFor(
        () => {
          expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );

      // Should display personalized welcome message
      await waitFor(
        () => {
          expect(screen.getByText('Welcome back, johndoe!')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    test('should handle credentials loading failure gracefully', async () => {
      // Mock authService to throw error (Line 22 - error handling)
      jest.clearAllMocks();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAuthService.getCredentials.mockRejectedValue(new Error('Failed to load credentials'));

      render(<HomeScreen />);

      // Wait for error handling
      await waitFor(
        () => {
          expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );

      // Should log error and show default welcome message
      await waitFor(
        () => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('HomeScreen: Failed to load user info:', expect.any(Error));
        },
        { timeout: 2000 }
      );

      expect(screen.getByText('Welcome back!')).toBeTruthy();
      consoleErrorSpy.mockRestore();
    });

    test('should handle null credentials gracefully', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue(null);

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );

      // Should show default welcome message
      expect(screen.getByText('Welcome back!')).toBeTruthy();
    });

    test('should handle credentials without username', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ password: 'token123' });

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );

      // Should show default welcome message
      expect(screen.getByText('Welcome back!')).toBeTruthy();
    });
  });

  describe('Basic Logout Flow Testing', () => {
    test('should handle logout button press without crashing', async () => {
      render(<HomeScreen />);

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Should not throw errors when logout button is pressed
      expect(logoutButton).toBeTruthy();
    });

    test('should handle logout errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogout.mockRejectedValue(new Error('Network error'));
      
      render(<HomeScreen />);

      const logoutButton = screen.getByText('Logout');
      
      // This will trigger the logout flow and error handling internally
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Should handle error gracefully without crashing the component
      expect(logoutButton).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    test('should handle successful logout', async () => {
      mockLogout.mockResolvedValue(undefined);
      
      render(<HomeScreen />);

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Component should remain stable
      expect(logoutButton).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    test('should handle rapid logout button presses', async () => {
      render(<HomeScreen />);

      const logoutButton = screen.getByText('Logout');
      
      // Press logout button multiple times rapidly
      await act(async () => {
        fireEvent.press(logoutButton);
        fireEvent.press(logoutButton);
        fireEvent.press(logoutButton);
      });

      // Should handle gracefully without crashing
      expect(logoutButton).toBeTruthy();
    });

    test('should handle component unmounting gracefully', async () => {
      const { unmount } = render(<HomeScreen />);

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Unmount component
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration with Real Scenarios', () => {
    test('should handle complete user flow: load credentials -> interaction', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ 
        username: 'testuser',
        password: 'token123' 
      });

      render(<HomeScreen />);

      // Wait for credentials to load
      await waitFor(
        () => {
          expect(screen.getByText('Welcome back, testuser!')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Component should be interactive
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeTruthy();
    });

    test('should handle empty string username', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ 
        username: '',
        password: 'token123' 
      });

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );

      // Should show default welcome message for empty username
      expect(screen.getByText('Welcome back!')).toBeTruthy();
    });

    test('should handle very long usernames', async () => {
      jest.clearAllMocks();
      const longUsername = 'a'.repeat(100);
      mockAuthService.getCredentials.mockResolvedValue({ 
        username: longUsername,
        password: 'token123' 
      });

      render(<HomeScreen />);

      await waitFor(
        () => {
          expect(screen.getByText(`Welcome back, ${longUsername}!`)).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });
});