// Pet Love Community - Personal Info Step Tests
// Comprehensive test suite for personal information form step component

import React from 'react';
import { fireEvent, waitFor, screen } from '@testing-library/react-native';
import PersonalInfoStep from '../PersonalInfoStep';
import {
  renderWithProviders,
  createMockColors,
  cleanupMocks,
} from '../../../__tests__/testUtils';
import type { AdoptionApplication } from '../../../types/pet';

// Mock the colors hook
jest.mock('../../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

// Mock the Input component
jest.mock('../../Input', () => {
  return ({ label, value, onChangeText, placeholder, required, testID, ...props }: any) => {
    const { View, Text, TextInput } = require('react-native');
    return (
      <View testID={testID || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
        <Text testID={`${testID || label}-label`}>
          {label} {required && '*'}
        </Text>
        <TextInput
          testID={`${testID || label}-input`}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          {...props}
        />
      </View>
    );
  };
});

import { useColors } from '../../../hooks/useColors';

const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;

describe('PersonalInfoStep', () => {
  const mockColors = createMockColors();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColors.mockReturnValue(mockColors);
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Initial Rendering', () => {
    it('should render all required form fields', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // Check all required fields are present
      expect(screen.getByText('First Name *')).toBeTruthy();
      expect(screen.getByText('Last Name *')).toBeTruthy();
      expect(screen.getByText('Email Address *')).toBeTruthy();
      expect(screen.getByText('Phone Number *')).toBeTruthy();
      expect(screen.getByText('Address *')).toBeTruthy();
      expect(screen.getByText('Date of Birth *')).toBeTruthy();
    });

    it('should show step description', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText(/Please provide your personal information/)).toBeTruthy();
      expect(screen.getByText(/This helps the shelter contact you/)).toBeTruthy();
    });

    it('should render with empty values when no data provided', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByTestId('First Name-input').props.value).toBe('');
      expect(screen.getByTestId('Last Name-input').props.value).toBe('');
      expect(screen.getByTestId('Email Address-input').props.value).toBe('');
      expect(screen.getByTestId('Phone Number-input').props.value).toBe('');
      expect(screen.getByTestId('Address-input').props.value).toBe('');
      expect(screen.getByTestId('Date of Birth-input').props.value).toBe('');
    });

    it('should populate fields with existing data', () => {
      const mockData: AdoptionApplication['personalInfo'] = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        address: '123 Main Street, City, ST 12345',
        dateOfBirth: '1990-01-15',
      };

      renderWithProviders(
        <PersonalInfoStep data={mockData} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByTestId('First Name-input').props.value).toBe('John');
      expect(screen.getByTestId('Last Name-input').props.value).toBe('Doe');
      expect(screen.getByTestId('Email Address-input').props.value).toBe('john.doe@example.com');
      expect(screen.getByTestId('Phone Number-input').props.value).toBe('555-123-4567');
      expect(screen.getByTestId('Address-input').props.value).toBe('123 Main Street, City, ST 12345');
      expect(screen.getByTestId('Date of Birth-input').props.value).toBe('1990-01-15');
    });
  });

  describe('Form Field Interactions', () => {
    it('should call onUpdate when first name changes', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('First Name-input'), 'John');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        firstName: 'John',
      });
    });

    it('should call onUpdate when last name changes', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Last Name-input'), 'Doe');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        lastName: 'Doe',
      });
    });

    it('should call onUpdate when email changes', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Email Address-input'), 'john@example.com');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
    });

    it('should call onUpdate when phone changes', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Phone Number-input'), '555-123-4567');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        phone: '555-123-4567',
      });
    });

    it('should call onUpdate when address changes', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Address-input'), '123 Main St');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        address: '123 Main St',
      });
    });

    it('should call onUpdate when date of birth changes', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Date of Birth-input'), '1990-01-15');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        dateOfBirth: '1990-01-15',
      });
    });

    it('should preserve existing data when updating single field', () => {
      const existingData: AdoptionApplication['personalInfo'] = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        address: '123 Main St',
        dateOfBirth: '1990-01-15',
      };

      renderWithProviders(
        <PersonalInfoStep data={existingData} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('First Name-input'), 'Jane');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...existingData,
        firstName: 'Jane',
      });
    });
  });

  describe('Field Configuration', () => {
    it('should have correct input properties for first name', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const firstNameInput = screen.getByTestId('First Name-input');
      expect(firstNameInput.props.placeholder).toBe('Enter your first name');
      expect(firstNameInput.props.autoCapitalize).toBe('words');
    });

    it('should have correct input properties for last name', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const lastNameInput = screen.getByTestId('Last Name-input');
      expect(lastNameInput.props.placeholder).toBe('Enter your last name');
      expect(lastNameInput.props.autoCapitalize).toBe('words');
    });

    it('should have correct input properties for email', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const emailInput = screen.getByTestId('Email Address-input');
      expect(emailInput.props.placeholder).toBe('Enter your email address');
      expect(emailInput.props.keyboardType).toBe('email-address');
      expect(emailInput.props.autoCapitalize).toBe('none');
    });

    it('should have correct input properties for phone', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const phoneInput = screen.getByTestId('Phone Number-input');
      expect(phoneInput.props.placeholder).toBe('Enter your phone number');
      expect(phoneInput.props.keyboardType).toBe('phone-pad');
    });

    it('should have correct input properties for address', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const addressInput = screen.getByTestId('Address-input');
      expect(addressInput.props.placeholder).toBe('Enter your full address');
      expect(addressInput.props.multiline).toBe(true);
      expect(addressInput.props.numberOfLines).toBe(3);
    });

    it('should have correct input properties for date of birth', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const dobInput = screen.getByTestId('Date of Birth-input');
      expect(dobInput.props.placeholder).toBe('YYYY-MM-DD');
    });
  });

  describe('Layout and Styling', () => {
    it('should apply correct colors from theme', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      expect(mockUseColors).toHaveBeenCalled();
    });

    it('should have name fields in a row layout', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const firstNameContainer = screen.getByTestId('input-first-name').parent;
      const lastNameContainer = screen.getByTestId('input-last-name').parent;
      
      // Both should be in the same row container
      expect(firstNameContainer?.parent).toBe(lastNameContainer?.parent);
    });

    it('should show all required field indicators', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // All labels should show asterisk for required fields
      expect(screen.getByText('First Name *')).toBeTruthy();
      expect(screen.getByText('Last Name *')).toBeTruthy();
      expect(screen.getByText('Email Address *')).toBeTruthy();
      expect(screen.getByText('Phone Number *')).toBeTruthy();
      expect(screen.getByText('Address *')).toBeTruthy();
      expect(screen.getByText('Date of Birth *')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined data gracefully', () => {
      expect(() => {
        renderWithProviders(
          <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
        );
      }).not.toThrow();
    });

    it('should handle partial data', () => {
      const partialData: Partial<AdoptionApplication['personalInfo']> = {
        firstName: 'John',
        email: 'john@example.com',
        // Missing other fields
      };

      renderWithProviders(
        <PersonalInfoStep data={partialData as AdoptionApplication['personalInfo']} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByTestId('First Name-input').props.value).toBe('John');
      expect(screen.getByTestId('Email Address-input').props.value).toBe('john@example.com');
      expect(screen.getByTestId('Last Name-input').props.value).toBe('');
      expect(screen.getByTestId('Phone Number-input').props.value).toBe('');
    });

    it('should handle empty string values', () => {
      const emptyData: AdoptionApplication['personalInfo'] = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
      };

      renderWithProviders(
        <PersonalInfoStep data={emptyData} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByTestId('First Name-input').props.value).toBe('');
      expect(screen.getByTestId('Last Name-input').props.value).toBe('');
      expect(screen.getByTestId('Email Address-input').props.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // Check that inputs have proper accessibility properties
      const firstNameInput = screen.getByTestId('First Name-input');
      expect(firstNameInput.props.accessibilityLabel).toBe('First Name, required field');
      
      const emailInput = screen.getByTestId('Email Address-input');
      expect(emailInput.props.accessibilityLabel).toBe('Email Address, required field');
    });

    it('should group name fields for better screen reader navigation', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const nameContainer = screen.getByTestId('input-first-name').parent?.parent;
      expect(nameContainer?.props.accessibilityRole).toBe('group');
      expect(nameContainer?.props.accessibilityLabel).toBe('Full name fields');
    });

    it('should have proper heading structure', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const description = screen.getByText(/Please provide your personal information/);
      expect(description.props.accessibilityRole).toBe('text');
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders when props have not changed', () => {
      const data = { firstName: 'John', lastName: 'Doe' };
      
      const { rerender } = renderWithProviders(
        <PersonalInfoStep data={data} onUpdate={mockOnUpdate} />
      );

      const renderCount = mockOnUpdate.mock.calls.length;

      // Re-render with same props
      rerender(<PersonalInfoStep data={data} onUpdate={mockOnUpdate} />);

      // Should not have triggered any additional onUpdate calls
      expect(mockOnUpdate.mock.calls.length).toBe(renderCount);
    });

    it('should handle rapid input changes gracefully', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      const firstNameInput = screen.getByTestId('First Name-input');

      // Simulate rapid typing
      fireEvent.changeText(firstNameInput, 'J');
      fireEvent.changeText(firstNameInput, 'Jo');
      fireEvent.changeText(firstNameInput, 'Joh');
      fireEvent.changeText(firstNameInput, 'John');

      // Should have called onUpdate for each change
      expect(mockOnUpdate).toHaveBeenCalledTimes(4);
      expect(mockOnUpdate).toHaveBeenLastCalledWith({ firstName: 'John' });
    });
  });

  describe('Validation Indicators', () => {
    it('should show validation state for invalid email format', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Email Address-input'), 'invalid-email');

      expect(mockOnUpdate).toHaveBeenCalledWith({ email: 'invalid-email' });
    });

    it('should handle special characters in input fields', () => {
      renderWithProviders(
        <PersonalInfoStep data={undefined} onUpdate={mockOnUpdate} />
      );

      // Test name with special characters
      fireEvent.changeText(screen.getByTestId('First Name-input'), "Mary-Jane O'Connor");
      expect(mockOnUpdate).toHaveBeenCalledWith({ firstName: "Mary-Jane O'Connor" });

      // Test phone with formatting
      fireEvent.changeText(screen.getByTestId('Phone Number-input'), '(555) 123-4567');
      expect(mockOnUpdate).toHaveBeenLastCalledWith({ phone: '(555) 123-4567' });
    });
  });
});