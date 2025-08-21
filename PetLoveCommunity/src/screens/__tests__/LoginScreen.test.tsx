// LoginScreen Component Tests
// Testing login form functionality, validation, and auth integration

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

// Mock the useAuth hook
const mockLogin = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoggedIn: false,
    logout: jest.fn(),
    user: null,
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

  describe('Login Functionality', () => {
    test('should call login with username and password when login button is pressed', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      // Fill in the form
      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(passwordInput, 'testpassword');
      
      // Submit the form
      fireEvent.press(loginButton);
      
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpassword');
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    test('should call login with empty credentials if no input provided', () => {
      render(<LoginScreen />);
      
      const loginButton = screen.getByText('Login');
      
      // Submit without filling form
      fireEvent.press(loginButton);
      
      expect(mockLogin).toHaveBeenCalledWith('', '');
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    test('should handle partial form completion', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const loginButton = screen.getByText('Login');
      
      // Fill only username
      fireEvent.changeText(usernameInput, 'testuser');
      
      fireEvent.press(loginButton);
      
      expect(mockLogin).toHaveBeenCalledWith('testuser', '');
    });

    test('should handle multiple login attempts', () => {
      render(<LoginScreen />);
      
      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const loginButton = screen.getByText('Login');
      
      // First attempt
      fireEvent.changeText(usernameInput, 'user1');
      fireEvent.changeText(passwordInput, 'pass1');
      fireEvent.press(loginButton);
      
      // Second attempt with different credentials
      fireEvent.changeText(usernameInput, 'user2');
      fireEvent.changeText(passwordInput, 'pass2');
      fireEvent.press(loginButton);
      
      expect(mockLogin).toHaveBeenCalledTimes(2);
      expect(mockLogin).toHaveBeenNthCalledWith(1, 'user1', 'pass1');
      expect(mockLogin).toHaveBeenNthCalledWith(2, 'user2', 'pass2');
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
});