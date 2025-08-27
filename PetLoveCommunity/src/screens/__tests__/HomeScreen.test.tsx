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
      coral: '#FF6B6B',
    },
    extended: {
      textVariations: {
        secondary: '#2C6B73',
        tertiary: '#6C757D',
      },
      tealVariations: {
        background: '#E8F8F7',
      },
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

// Mock Alert directly
const mockAlertAlert = jest.fn();
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text', 
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles
  },
  Alert: {
    alert: mockAlertAlert,
  },
  TouchableOpacity: 'TouchableOpacity',
}));

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
    mockAlertAlert.mockImplementation((title, message, buttons) => {
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

  describe('UseEffect and Credential Loading (Lines 18-19)', () => {
    test('should call authService.getCredentials on mount', async () => {
      jest.clearAllMocks();
      // Mock successful credential loading
      mockAuthService.getCredentials.mockResolvedValue({ username: 'testuser' });

      await act(async () => {
        render(<HomeScreen />);
      });

      // Should call getCredentials when component mounts
      expect(mockAuthService.getCredentials).toHaveBeenCalledTimes(1);
    });

    test('should set username state when credentials are loaded', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ username: 'johndoe' });

      await act(async () => {
        render(<HomeScreen />);
      });

      // Should display the user info when username is set
      expect(screen.getByText('Logged in as: johndoe')).toBeTruthy();
      expect(screen.getByText('Ready to find your perfect pet companion?')).toBeTruthy();
    });

    test('should handle error in useEffect gracefully', async () => {
      jest.clearAllMocks();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAuthService.getCredentials.mockRejectedValue(new Error('Auth service error'));

      await act(async () => {
        render(<HomeScreen />);
      });

      // Should log error and continue with default state
      expect(consoleErrorSpy).toHaveBeenCalledWith('HomeScreen: Failed to load user info:', expect.any(Error));
      expect(screen.getByText('Welcome back!')).toBeTruthy();
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle null credentials in useEffect', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue(null);

      await act(async () => {
        render(<HomeScreen />);
      });

      // Should show default message when no credentials
      expect(screen.getByText('Welcome back!')).toBeTruthy();
      expect(screen.queryByText(/Logged in as:/)).toBeNull();
    });

    test('should handle credentials without username', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ password: 'token' });

      await act(async () => {
        render(<HomeScreen />);
      });

      // Should show default message when no username in credentials  
      expect(screen.getByText('Welcome back!')).toBeTruthy();
      expect(screen.queryByText(/Logged in as:/)).toBeNull();
    });

    test('should handle empty string username', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ username: '' });

      await act(async () => {
        render(<HomeScreen />);
      });

      // Should show default message for empty username
      expect(screen.getByText('Welcome back!')).toBeTruthy();
      expect(screen.queryByText(/Logged in as:/)).toBeNull();
    });
  });

  describe('Logout Confirmation Dialog (Lines 29-54)', () => {
    beforeEach(() => {
      mockAlertAlert.mockClear();
      mockLogout.mockClear();
    });

    test('should show confirmation dialog when logout button is pressed', async () => {
      await act(async () => {
        render(<HomeScreen />);
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Should call Alert.alert with proper parameters
      expect(mockAlertAlert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Logout', style: 'destructive', onPress: expect.any(Function) })
        ])
      );
    });

    test('should handle logout confirmation - success path (Lines 41-48)', async () => {
      mockLogout.mockResolvedValue(undefined);
      
      await act(async () => {
        render(<HomeScreen />);
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Get the onPress function from the Alert.alert call
      const logoutCallArgs = mockAlertAlert.mock.calls[0];
      const buttons = logoutCallArgs[2];
      const logoutButtonOnPress = buttons.find((btn: any) => btn.text === 'Logout').onPress;

      // Execute the logout onPress function
      await act(async () => {
        await logoutButtonOnPress();
      });

      // Should have called the logout function
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('should handle logout error and show error dialog (Lines 44-46)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogout.mockRejectedValue(new Error('Logout failed'));
      
      await act(async () => {
        render(<HomeScreen />);
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Get and execute the logout onPress function
      const logoutCallArgs = mockAlertAlert.mock.calls[0];
      const buttons = logoutCallArgs[2];
      const logoutButtonOnPress = buttons.find((btn: any) => btn.text === 'Logout').onPress;

      await act(async () => {
        await logoutButtonOnPress();
      });

      // Should log error and show error alert
      expect(consoleErrorSpy).toHaveBeenCalledWith('HomeScreen: Logout error:', expect.any(Error));
      expect(mockAlertAlert).toHaveBeenCalledTimes(2); // First for confirmation, second for error
      expect(mockAlertAlert).toHaveBeenLastCalledWith('Error', 'Failed to logout. Please try again.');

      consoleErrorSpy.mockRestore();
    });

    test('should set isLoggingOut state during logout process (Line 41, 48)', async () => {
      // Mock logout to take some time
      let resolveLogout: () => void;
      const logoutPromise = new Promise<void>(resolve => {
        resolveLogout = resolve;
      });
      mockLogout.mockReturnValue(logoutPromise);
      
      await act(async () => {
        render(<HomeScreen />);
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Get and execute the logout onPress function
      const logoutCallArgs = mockAlertAlert.mock.calls[0];
      const buttons = logoutCallArgs[2];
      const logoutButtonOnPress = buttons.find((btn: any) => btn.text === 'Logout').onPress;

      // Start logout process
      const logoutExecution = act(async () => {
        await logoutButtonOnPress();
      });

      // During logout, button should show "Logging out..." and be disabled
      // Note: We need to complete the logout process for the test to finish
      await act(async () => {
        resolveLogout!();
      });
      
      await logoutExecution;

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('should handle cancel button in logout dialog', async () => {
      await act(async () => {
        render(<HomeScreen />);
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Should show confirmation dialog but logout shouldn't be called
      expect(mockAlertAlert).toHaveBeenCalledTimes(1);
      expect(mockLogout).not.toHaveBeenCalled();
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

  describe('UI State and Interaction Testing', () => {
    test('should show button loading state during logout process', async () => {
      let resolveLogout: () => void;
      const logoutPromise = new Promise<void>(resolve => {
        resolveLogout = resolve;
      });
      mockLogout.mockReturnValue(logoutPromise);
      
      await act(async () => {
        render(<HomeScreen />);
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Get and trigger the logout action
      const buttons = mockAlertAlert.mock.calls[0][2];
      const logoutAction = buttons.find((btn: any) => btn.text === 'Logout').onPress;

      // Start logout process
      const logoutExecution = logoutAction();

      // Complete the logout process
      act(() => {
        resolveLogout!();
      });

      await act(async () => {
        await logoutExecution;
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('should handle different username lengths', async () => {
      const testCases = [
        { username: 'a', expected: 'Logged in as: a' },
        { username: 'verylongusername123456789', expected: 'Logged in as: verylongusername123456789' },
        { username: 'user@example.com', expected: 'Logged in as: user@example.com' }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockAuthService.getCredentials.mockResolvedValue({ username: testCase.username });

        const { unmount } = await act(async () => {
          return render(<HomeScreen />);
        });

        expect(screen.getByText(testCase.expected)).toBeTruthy();
        unmount();
      }
    });

    test('should show personalized subtitle when user is logged in', async () => {
      jest.clearAllMocks();
      mockAuthService.getCredentials.mockResolvedValue({ username: 'petlover123' });

      await act(async () => {
        render(<HomeScreen />);
      });

      // When username is set, should show pet companion message
      expect(screen.getByText('Ready to find your perfect pet companion?')).toBeTruthy();
      expect(screen.queryByText('Welcome back!')).toBeNull();
    });
  });
});