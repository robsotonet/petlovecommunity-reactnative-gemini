// Pet Love Community - Application Form Steps Integration Tests
// Integration tests for all form step components working together

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../__tests__/testUtils';
import type { AdoptionApplication } from '../../../types/pet';

// Import all step components
import PersonalInfoStep from '../PersonalInfoStep';
import LivingSituationStep from '../LivingSituationStep';
import ExperienceStep from '../ExperienceStep';
import PreferencesStep from '../PreferencesStep';
import ReviewStep from '../ReviewStep';

// Mock hooks
jest.mock('../../../hooks/useColors', () => ({
  useColors: jest.fn(() => ({
    primary: { coral: '#FF6B6B', teal: '#4ECDC4' },
    neutral: { midnight: '#1A535C', beige: '#F7FFF7' },
    extended: {
      coralVariations: { light: '#FF8E8E', dark: '#E55555' },
      tealVariations: { light: '#6ED4CC', dark: '#3BB5B0', background: '#E6F7F7' },
      textVariations: { secondary: '#666666' },
    },
  })),
}));

// Mock Input component
jest.mock('../../Input', () => {
  return ({ label, value, onChangeText, testID }: any) => {
    const { View, Text, TextInput } = require('react-native');
    return (
      <View testID={testID || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`}>
        <Text>{label}</Text>
        <TextInput
          testID={`${testID || label}-input`}
          value={value || ''}
          onChangeText={onChangeText}
        />
      </View>
    );
  };
});

describe('Application Form Steps Integration', () => {
  describe('PersonalInfoStep Integration', () => {
    it('should handle complete form flow', () => {
      let formData: Partial<AdoptionApplication['personalInfo']> = {};
      const onUpdate = jest.fn((data) => {
        formData = { ...formData, ...data };
      });

      const { rerender } = renderWithProviders(
        <PersonalInfoStep data={formData} onUpdate={onUpdate} />
      );

      // Fill out all fields
      fireEvent.changeText(screen.getByTestId('First Name-input'), 'John');
      rerender(<PersonalInfoStep data={formData} onUpdate={onUpdate} />);

      fireEvent.changeText(screen.getByTestId('Last Name-input'), 'Doe');
      rerender(<PersonalInfoStep data={formData} onUpdate={onUpdate} />);

      fireEvent.changeText(screen.getByTestId('Email Address-input'), 'john@example.com');
      rerender(<PersonalInfoStep data={formData} onUpdate={onUpdate} />);

      // Verify all updates were called
      expect(onUpdate).toHaveBeenCalledWith({ firstName: 'John' });
      expect(onUpdate).toHaveBeenCalledWith({ lastName: 'Doe' });
      expect(onUpdate).toHaveBeenCalledWith({ email: 'john@example.com' });
    });

    it('should preserve existing data when updating', () => {
      const existingData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const onUpdate = jest.fn();

      renderWithProviders(
        <PersonalInfoStep data={existingData} onUpdate={onUpdate} />
      );

      fireEvent.changeText(screen.getByTestId('Phone Number-input'), '555-123-4567');

      expect(onUpdate).toHaveBeenCalledWith({
        ...existingData,
        phone: '555-123-4567',
      });
    });
  });

  describe('LivingSituationStep Integration', () => {
    it('should handle complete selection flow', () => {
      let formData: Partial<AdoptionApplication['livingSituation']> = {};
      const onUpdate = jest.fn((data) => {
        formData = { ...formData, ...data };
      });

      const { rerender } = renderWithProviders(
        <LivingSituationStep data={formData} onUpdate={onUpdate} />
      );

      // Select housing type
      fireEvent.press(screen.getByText('House'));
      rerender(<LivingSituationStep data={formData} onUpdate={onUpdate} />);

      // Select own/rent
      fireEvent.press(screen.getByText('Own'));
      rerender(<LivingSituationStep data={formData} onUpdate={onUpdate} />);

      // Select yard type
      fireEvent.press(screen.getByText('Large Yard'));

      // Verify all selections were made
      expect(onUpdate).toHaveBeenCalledWith({ housingType: 'house' });
      expect(onUpdate).toHaveBeenCalledWith({ ownOrRent: 'own' });
      expect(onUpdate).toHaveBeenCalledWith({ yardType: 'large' });
    });

    it('should change selections correctly', () => {
      const initialData = {
        housingType: 'apartment' as const,
        ownOrRent: 'rent' as const,
        yardType: 'no_yard' as const,
      };

      const onUpdate = jest.fn();

      renderWithProviders(
        <LivingSituationStep data={initialData} onUpdate={onUpdate} />
      );

      // Change to house
      fireEvent.press(screen.getByText('House'));

      expect(onUpdate).toHaveBeenCalledWith({
        ...initialData,
        housingType: 'house',
      });
    });
  });

  describe('ExperienceStep Integration', () => {
    it('should render and handle basic interactions', () => {
      const onUpdate = jest.fn();

      expect(() => {
        renderWithProviders(
          <ExperienceStep data={undefined} onUpdate={onUpdate} />
        );
      }).not.toThrow();

      // Should have basic UI elements
      expect(screen.getByText(/pet experience/i)).toBeTruthy();
    });
  });

  describe('PreferencesStep Integration', () => {
    it('should render and handle basic interactions', () => {
      const onUpdate = jest.fn();

      expect(() => {
        renderWithProviders(
          <PreferencesStep data={undefined} onUpdate={onUpdate} />
        );
      }).not.toThrow();

      // Should have basic UI elements
      expect(screen.getByText(/preferences/i)).toBeTruthy();
    });
  });

  describe('ReviewStep Integration', () => {
    it('should render with complete application data', () => {
      const completeData: AdoptionApplication = {
        id: 'app-123',
        petId: 'pet-123',
        userId: 'user-123',
        status: 'draft',
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
          address: '123 Main St',
          dateOfBirth: '1990-01-01',
        },
        livingSituation: {
          housingType: 'house',
          ownOrRent: 'own',
          yardType: 'large',
        },
        experience: {
          previousPets: true,
          currentPets: [],
          petExperience: 'Had dogs for 10 years',
        },
        references: [],
        documents: [],
        submittedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const onSubmit = jest.fn();

      expect(() => {
        renderWithProviders(
          <ReviewStep data={completeData} onSubmit={onSubmit} />
        );
      }).not.toThrow();

      // Should display review information
      expect(screen.getByText(/review/i)).toBeTruthy();
    });
  });

  describe('Multi-Step Form Flow', () => {
    it('should simulate complete application workflow', () => {
      let currentStep = 1;
      let applicationData: Partial<AdoptionApplication> = {};

      const updatePersonalInfo = (data: AdoptionApplication['personalInfo']) => {
        applicationData.personalInfo = { ...applicationData.personalInfo, ...data };
      };

      const updateLivingSituation = (data: AdoptionApplication['livingSituation']) => {
        applicationData.livingSituation = { ...applicationData.livingSituation, ...data };
      };

      // Step 1: Personal Info
      const { rerender } = renderWithProviders(
        <PersonalInfoStep data={applicationData.personalInfo} onUpdate={updatePersonalInfo} />
      );

      fireEvent.changeText(screen.getByTestId('First Name-input'), 'John');
      fireEvent.changeText(screen.getByTestId('Last Name-input'), 'Doe');
      fireEvent.changeText(screen.getByTestId('Email Address-input'), 'john@example.com');

      expect(applicationData.personalInfo?.firstName).toBe('John');
      expect(applicationData.personalInfo?.lastName).toBe('Doe');
      expect(applicationData.personalInfo?.email).toBe('john@example.com');

      // Step 2: Living Situation
      currentStep = 2;
      rerender(
        <LivingSituationStep data={applicationData.livingSituation} onUpdate={updateLivingSituation} />
      );

      fireEvent.press(screen.getByText('House'));
      fireEvent.press(screen.getByText('Own'));
      fireEvent.press(screen.getByText('Large Yard'));

      expect(applicationData.livingSituation?.housingType).toBe('house');
      expect(applicationData.livingSituation?.ownOrRent).toBe('own');
      expect(applicationData.livingSituation?.yardType).toBe('large');

      // Verify we have a complete application flow
      expect(applicationData.personalInfo).toBeDefined();
      expect(applicationData.livingSituation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined data gracefully across all components', () => {
      const onUpdate = jest.fn();
      const onSubmit = jest.fn();

      expect(() => {
        renderWithProviders(
          <PersonalInfoStep data={undefined} onUpdate={onUpdate} />
        );
      }).not.toThrow();

      expect(() => {
        renderWithProviders(
          <LivingSituationStep data={undefined} onUpdate={onUpdate} />
        );
      }).not.toThrow();

      expect(() => {
        renderWithProviders(
          <ExperienceStep data={undefined} onUpdate={onUpdate} />
        );
      }).not.toThrow();

      expect(() => {
        renderWithProviders(
          <PreferencesStep data={undefined} onUpdate={onUpdate} />
        );
      }).not.toThrow();

      expect(() => {
        renderWithProviders(
          <ReviewStep data={undefined} onSubmit={onSubmit} />
        );
      }).not.toThrow();
    });
  });

  describe('Form Validation Scenarios', () => {
    it('should handle validation for personal info completeness', () => {
      const completePersonalInfo = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        address: '123 Main St',
        dateOfBirth: '1990-01-01',
      };

      const incompletePersonalInfo = {
        firstName: 'John',
        // Missing required fields
      };

      const onUpdate = jest.fn();

      // Test complete data
      const { rerender } = renderWithProviders(
        <PersonalInfoStep data={completePersonalInfo} onUpdate={onUpdate} />
      );

      expect(screen.getByTestId('First Name-input').props.value).toBe('John');
      expect(screen.getByTestId('Email Address-input').props.value).toBe('john@example.com');

      // Test incomplete data
      rerender(<PersonalInfoStep data={incompletePersonalInfo} onUpdate={onUpdate} />);

      expect(screen.getByTestId('First Name-input').props.value).toBe('John');
      expect(screen.getByTestId('Email Address-input').props.value).toBe('');
    });

    it('should handle validation for living situation completeness', () => {
      const completeLivingSituation = {
        housingType: 'house' as const,
        ownOrRent: 'own' as const,
        yardType: 'large' as const,
      };

      const incompleteLivingSituation = {
        housingType: 'house' as const,
        // Missing other fields
      };

      const onUpdate = jest.fn();

      // Test complete data - should show selected states
      renderWithProviders(
        <LivingSituationStep data={completeLivingSituation} onUpdate={onUpdate} />
      );

      // House should be selected
      const houseButton = screen.getByText('House');
      expect(houseButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#FF6B6B', // coral color for selected
        })
      );

      // Own should be selected
      const ownButton = screen.getByText('Own');
      expect(ownButton.parent?.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#FF6B6B', // coral color for selected
        })
      );
    });
  });
});