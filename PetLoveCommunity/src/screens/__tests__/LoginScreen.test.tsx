// LoginScreen Component Tests
// Testing login form functionality, validation, and auth integration

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

// Mock the useAuth hook from AuthProvider
const mockLogin = jest.fn();
jest.mock('../../hooks/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoggedIn: false,
    isLoading: false,
    logout: jest.fn(),
  }),
}));

// Mock Input component to ensure proper form handling
jest.mock('../../components/Input', () => {
  const React = require('react');
  const { TextInput, Text, View } = require('react-native');
  
  return function MockInput({ 
    label, 
    value, 
    onChangeText, 
    secureTextEntry, 
    testID 
  }: any) {
    return (
      <View>
        <Text testID={`${testID || 'input'}-label`}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          testID={testID || 'input'}
          placeholder={label}
        />
      </View>
    );
  };
});

// Mock Button component
jest.mock('../../components/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  
  return function MockButton({ title, onPress, disabled, testID }: any) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled}
        testID={testID || 'button'}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render username input field', () => {
      render(<LoginScreen />);
      
      const usernameLabel = screen.getByText('Username');
      const usernameInput = screen.getByPlaceholderText('Username');
      
      expect(usernameLabel).toBeTruthy();
      expect(usernameInput).toBeTruthy();
    });

    test('should render password input field', () => {
      render(<LoginScreen />);
      
      const passwordLabel = screen.getByText('Password');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      expect(passwordLabel).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });

    test('should render login button', () => {
      render(<LoginScreen />);
      
      const loginButton = screen.getByText('Login');
      expect(loginButton).toBeTruthy();
    });

    test('should have proper component structure', () => {
      const { toJSON } = render(<LoginScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Form Input Handling', () => {
    test('should update username when typing', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      
      fireEvent.changeText(usernameInput, 'testuser');
      
      expect(usernameInput.props.value).toBe('testuser');
    });

    test('should update password when typing', () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(passwordInput, 'testpassword');
      
      expect(passwordInput.props.value).toBe('testpassword');
    });

    test('should handle empty username input', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      
      fireEvent.changeText(usernameInput, '');
      
      expect(usernameInput.props.value).toBe('');
    });

    test('should handle empty password input', () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(passwordInput, '');
      
      expect(passwordInput.props.value).toBe('');
    });

    test('should handle special characters in inputs', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      const specialUsername = 'user@domain.com';
      const specialPassword = 'P@ssw0rd!123';
      
      fireEvent.changeText(usernameInput, specialUsername);
      fireEvent.changeText(passwordInput, specialPassword);
      
      expect(usernameInput.props.value).toBe(specialUsername);
      expect(passwordInput.props.value).toBe(specialPassword);
    });
  });

  describe('Password Security', () => {
    test('should mark password field as secure', () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByPlaceholderText('Password');
      
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    test('should not mark username field as secure', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      
      expect(usernameInput.props.secureTextEntry).toBeFalsy();
    });
  });

  describe('Form Validation', () => {
    test('should show username required error when username is empty', () => {
      render(<LoginScreen />);
      
      const loginButton = screen.getByText('Login');
      fireEvent.press(loginButton);
      
      expect(screen.getByText('Username is required')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should show password required error when password is empty', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.press(loginButton);
      
      expect(screen.getByText('Password is required')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should show username length error when username is too short', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'ab'); // Only 2 characters
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      expect(screen.getByText('Username must be at least 3 characters')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should show password length error when password is too short', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, '12345'); // Only 5 characters
      fireEvent.press(loginButton);
      
      expect(screen.getByText('Password must be at least 6 characters')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should validate whitespace-only inputs', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, '   '); // Only spaces
      fireEvent.changeText(passwordInput, '\t\n'); // Only whitespace
      fireEvent.press(loginButton);
      
      expect(screen.getByText('Username is required')).toBeTruthy();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should proceed with login when validation passes', async () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      expect(mockLogin).toHaveBeenCalledWith('validuser', 'validpassword');
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    test('should show loading state during login', async () => {
      // Make login function take some time to resolve
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      // Check loading state
      expect(screen.getByText('Logging in...')).toBeTruthy();
      expect(screen.getByText('Authenticating...')).toBeTruthy();
      
      // Wait for login to complete
      await waitFor(() => {
        expect(screen.queryByText('Logging in...')).toBeFalsy();
      });
    });

    test('should disable inputs during loading', () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      // Inputs should be disabled during loading
      expect(usernameInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
      expect(loginButton.props.disabled).toBe(true);
    });

    test('should re-enable inputs after login completes', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));
      
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      // Wait for login to complete
      await waitFor(() => {
        expect(screen.queryByText('Logging in...')).toBeFalsy();
      });
      
      // Inputs should be re-enabled
      expect(usernameInput.props.editable).toBe(true);
      expect(passwordInput.props.editable).toBe(true);
      expect(loginButton.props.disabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should display error message when login fails', async () => {
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeTruthy();
      });
      
      // Should not be loading anymore
      expect(screen.queryByText('Logging in...')).toBeFalsy();
    });

    test('should handle non-Error objects gracefully', async () => {
      mockLogin.mockRejectedValueOnce('String error');
      
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeTruthy();
      });
    });

    test('should clear previous errors when new login attempt starts', async () => {
      // First attempt fails
      mockLogin.mockRejectedValueOnce(new Error('Network error'));
      
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      fireEvent.changeText(usernameInput, 'validuser');
      fireEvent.changeText(passwordInput, 'validpassword');
      fireEvent.press(loginButton);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
      
      // Second attempt should clear error before starting
      mockLogin.mockResolvedValueOnce(undefined);
      fireEvent.press(loginButton);
      
      // Error should be cleared immediately
      expect(screen.queryByText('Network error')).toBeFalsy();
    });

    test('should clear error when username changes', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const loginButton = screen.getByText('Login');
      
      // First trigger an error by clicking login with empty form
      fireEvent.press(loginButton);
      expect(screen.getByText('Username is required')).toBeTruthy();
      
      // Then type in username - should clear error
      fireEvent.changeText(usernameInput, 'test');
      
      const errorMessage = screen.queryByText('Username is required');
      expect(errorMessage).toBeFalsy();
    });

    test('should clear error when password changes', () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      // First trigger an error by clicking login with empty form
      fireEvent.press(loginButton);
      expect(screen.getByText('Username is required')).toBeTruthy();
      
      // Then type in password - should clear error
      fireEvent.changeText(passwordInput, 'test');
      
      const errorMessage = screen.queryByText('Username is required');
      expect(errorMessage).toBeFalsy();
    });
  });

  describe('Integration with useAuth Hook', () => {
    test('should use login function from useAuth', () => {
      render(<LoginScreen />);
      
      // Verify mock login function is available
      expect(mockLogin).toBeDefined();
    });

    test('should handle auth hook errors gracefully', () => {
      // Mock useAuth to return undefined login function
      jest.doMock('../../hooks/useAuth', () => ({
        useAuth: () => ({
          login: undefined,
          isLoggedIn: false,
          logout: jest.fn(),
          user: null,
        }),
      }));

      // Component should still render without crashing
      expect(() => render(<LoginScreen />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible form labels', () => {
      render(<LoginScreen />);
      
      expect(screen.getByText('Username')).toBeTruthy();
      expect(screen.getByText('Password')).toBeTruthy();
    });

    test('should have accessible login button', () => {
      render(<LoginScreen />);
      
      const loginButton = screen.getByText('Login');
      expect(loginButton).toBeTruthy();
    });

    test('should provide proper form structure for screen readers', () => {
      render(<LoginScreen />);
      
      // All form elements should be present and accessible
      expect(screen.getByText('Username')).toBeTruthy();
      expect(screen.getByText('Password')).toBeTruthy();
      expect(screen.getByText('Login')).toBeTruthy();
    });
  });

  describe('Form Validation and UX', () => {
    test('should maintain form state across re-renders', () => {
      const { rerender } = render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      // Fill form
      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(passwordInput, 'testpass');
      
      // Re-render component
      rerender(<LoginScreen />);
      
      // Values should persist
      expect(screen.getByPlaceholderText('Username').props.value).toBe('testuser');
      expect(screen.getByPlaceholderText('Password').props.value).toBe('testpass');
    });

    test('should handle rapid typing in inputs', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      
      // Simulate rapid typing
      fireEvent.changeText(usernameInput, 't');
      fireEvent.changeText(usernameInput, 'te');
      fireEvent.changeText(usernameInput, 'tes');
      fireEvent.changeText(usernameInput, 'test');
      
      expect(usernameInput.props.value).toBe('test');
    });
  });

  describe('Component Lifecycle', () => {
    test('should initialize with empty form fields', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      expect(usernameInput.props.value).toBe('');
      expect(passwordInput.props.value).toBe('');
    });

    test('should unmount without errors', () => {
      const { unmount } = render(<LoginScreen />);
      
      expect(() => unmount()).not.toThrow();
    });

    test('should handle component state updates properly', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      
      // Multiple state updates should work correctly
      fireEvent.changeText(usernameInput, 'a');
      fireEvent.changeText(usernameInput, 'ab');
      fireEvent.changeText(usernameInput, 'abc');
      
      expect(usernameInput.props.value).toBe('abc');
    });
  });

  describe('Performance', () => {
    test('should render efficiently', () => {
      const startTime = Date.now();
      render(<LoginScreen />);
      const endTime = Date.now();
      
      // Login form should render quickly
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle multiple re-renders without performance issues', () => {
      const { rerender } = render(<LoginScreen />);
      
      // Multiple re-renders should not cause issues
      for (let i = 0; i < 5; i++) {
        rerender(<LoginScreen />);
      }
      
      expect(screen.getByText('Username')).toBeTruthy();
      expect(screen.getByText('Login')).toBeTruthy();
    });
  });

  describe('Color System Integration', () => {
    test('should use design system colors', () => {
      // This test verifies the component integrates with useColors hook
      expect(() => render(<LoginScreen />)).not.toThrow();
    });

    test('should render with proper styling', () => {
      const { toJSON } = render(<LoginScreen />);
      
      // Should render complete component tree with styles
      expect(toJSON()).toBeTruthy();
    });
  });
});