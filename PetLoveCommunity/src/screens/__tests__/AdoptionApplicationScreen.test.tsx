// Pet Love Community - Adoption Application Screen Tests
// Comprehensive test suite for multi-step adoption application workflow

import React from 'react';
import { fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdoptionApplicationScreen from '../AdoptionApplicationScreen';
import {
  renderWithProviders,
  createMockPet,
  createMockNavigation,
  createMockRoute,
  createMockColors,
  createMockAnalyticsTracker,
  createMockQueryResponse,
  cleanupMocks,
} from '../../__tests__/testUtils';

// Mock the pet API service
jest.mock('../../services/petApi', () => ({
  useGetPetByIdQuery: jest.fn(),
}));

// Mock the adoption hooks
jest.mock('../../hooks/useAdoption', () => ({
  useAdoptionApplication: jest.fn(),
  useApplicationForm: jest.fn(),
}));

// Mock the colors hook
jest.mock('../../hooks/useColors', () => ({
  useColors: jest.fn(),
}));

// Mock the analytics hook
jest.mock('../../hooks/useAnalytics', () => ({
  useAnalyticsTracker: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock form step components
jest.mock('../../components/ApplicationFormSteps/PersonalInfoStep', () => {
  return ({ data, onUpdate }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="personal-info-step">
        <Text testID="personal-info-title">Personal Information</Text>
        <Text testID="personal-info-data">
          {JSON.stringify(data || {})}
        </Text>
        <TouchableOpacity
          testID="update-personal-info"
          onPress={() => onUpdate({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' })}
        >
          <Text>Update Personal Info</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../components/ApplicationFormSteps/LivingSituationStep', () => {
  return ({ data, onUpdate }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="living-situation-step">
        <Text testID="living-situation-title">Living Situation</Text>
        <Text testID="living-situation-data">
          {JSON.stringify(data || {})}
        </Text>
        <TouchableOpacity
          testID="update-living-situation"
          onPress={() => onUpdate({ housingType: 'house', ownOrRent: 'own', yardType: 'large' })}
        >
          <Text>Update Living Situation</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../components/ApplicationFormSteps/ExperienceStep', () => {
  return ({ data, onUpdate }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="experience-step">
        <Text testID="experience-title">Pet Experience</Text>
        <Text testID="experience-data">
          {JSON.stringify(data || {})}
        </Text>
        <TouchableOpacity
          testID="update-experience"
          onPress={() => onUpdate({ previousPets: true, petExperience: 'Had dogs for 10 years' })}
        >
          <Text>Update Experience</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../components/ApplicationFormSteps/PreferencesStep', () => {
  return ({ data, onUpdate }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="preferences-step">
        <Text testID="preferences-title">Preferences</Text>
        <Text testID="preferences-data">
          {JSON.stringify(data || {})}
        </Text>
        <TouchableOpacity
          testID="update-preferences"
          onPress={() => onUpdate({ activityLevel: 'moderate', specialNeeds: false })}
        >
          <Text>Update Preferences</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../components/ApplicationFormSteps/ReviewStep', () => {
  return ({ data, onSubmit }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="review-step">
        <Text testID="review-title">Review & Submit</Text>
        <Text testID="review-data">
          {JSON.stringify(data || {})}
        </Text>
        <TouchableOpacity
          testID="submit-application"
          onPress={() => onSubmit()}
        >
          <Text>Submit Application</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

import { useGetPetByIdQuery } from '../../services/petApi';
import { useAdoptionApplication, useApplicationForm } from '../../hooks/useAdoption';
import { useColors } from '../../hooks/useColors';
import { useAnalyticsTracker } from '../../hooks/useAnalytics';

// Type the mocked hooks
const mockUseGetPetByIdQuery = useGetPetByIdQuery as jest.MockedFunction<typeof useGetPetByIdQuery>;
const mockUseAdoptionApplication = useAdoptionApplication as jest.MockedFunction<typeof useAdoptionApplication>;
const mockUseApplicationForm = useApplicationForm as jest.MockedFunction<typeof useApplicationForm>;
const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;
const mockUseAnalyticsTracker = useAnalyticsTracker as jest.MockedFunction<typeof useAnalyticsTracker>;

describe('AdoptionApplicationScreen', () => {
  const mockPet = createMockPet({ id: 'pet-123', name: 'Buddy' });
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute({ petId: 'pet-123' });
  const mockColors = createMockColors();
  const mockAnalytics = createMockAnalyticsTracker();

  const mockAdoptionHook = {
    currentApplication: {
      petId: null,
      step: 1,
      isSubmitting: false,
      submitError: null,
    },
    isSubmitting: false,
    submitError: null,
    canProceed: true,
    startApplication: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    submitApplication: jest.fn(),
    clearError: jest.fn(),
    getDraftByPetId: jest.fn().mockReturnValue(null),
  };

  const mockFormHook = {
    currentStep: 1,
    formData: {},
    updateFormData: jest.fn(),
    isStepValid: jest.fn().mockReturnValue(true),
    getCompletionPercentage: jest.fn().mockReturnValue(20),
    isSubmitting: false,
    submitError: null,
  };

  beforeEach(() => {
    // Setup default mock implementations
    mockUseColors.mockReturnValue(mockColors);
    mockUseAnalyticsTracker.mockReturnValue(mockAnalytics);
    mockUseGetPetByIdQuery.mockReturnValue(createMockQueryResponse(mockPet));
    mockUseAdoptionApplication.mockReturnValue(mockAdoptionHook);
    mockUseApplicationForm.mockReturnValue(mockFormHook);

    // Clear all mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Initial Rendering', () => {
    it('should render loading state while fetching pet data', () => {
      mockUseGetPetByIdQuery.mockReturnValue(
        createMockQueryResponse(undefined, true)
      );

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByTestId('loading-screen')).toBeTruthy();
    });

    it('should render application form when pet data loads', async () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(screen.getByText('Adopt Buddy')).toBeTruthy();
        expect(screen.getByText('Step 1 of 5')).toBeTruthy();
        expect(screen.getByText('Personal Information')).toBeTruthy();
      });
    });

    it('should show progress bar with correct completion percentage', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.style).toEqual(
        expect.objectContaining({
          width: '20%', // 20% completion from mockAdoptionHook
        })
      );
    });

    it('should display pet information header', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Adopt Buddy')).toBeTruthy();
      expect(screen.getByText('Golden Retriever • 3 years • Male')).toBeTruthy();
    });
  });

  describe('Step Navigation', () => {
    it('should show only "Next" button on first step', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Next')).toBeTruthy();
      expect(screen.queryByText('Previous')).toBeNull();
    });

    it('should show both "Previous" and "Next" buttons on middle steps', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 3,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('should show "Previous" and "Submit Application" on final step', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 5,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Submit Application')).toBeTruthy();
      expect(screen.queryByText('Next')).toBeNull();
    });

    it('should handle next step navigation', async () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(mockAdoptionHook.goToNextStep).toHaveBeenCalled();
      });

      expect(mockAnalytics.trackFormInteraction).toHaveBeenCalledWith(
        'adoption_application',
        'step_navigation',
        { from: 1, to: 2, direction: 'forward' }
      );
    });

    it('should handle previous step navigation', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 3,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByText('Previous'));

      expect(mockAdoptionHook.goToPreviousStep).toHaveBeenCalled();
      expect(mockAnalytics.trackFormInteraction).toHaveBeenCalledWith(
        'adoption_application',
        'step_navigation',
        { from: 3, to: 2, direction: 'backward' }
      );
    });

    it('should prevent navigation when validation fails', async () => {
      mockUseApplicationForm.mockReturnValue({
        ...mockFormHook,
        validateCurrentStep: jest.fn().mockReturnValue(false),
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(mockAdoptionHook.goToNextStep).not.toHaveBeenCalled();
      });
    });

    it('should disable next button when canProceed is false', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        canProceed: false,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton.parent?.props.style).toEqual(
        expect.objectContaining({ opacity: 0.5 })
      );
    });
  });

  describe('Form Step Rendering', () => {
    const stepTestCases = [
      { step: 1, testId: 'personal-info-step', title: 'Personal Information' },
      { step: 2, testId: 'living-situation-step', title: 'Living Situation' },
      { step: 3, testId: 'experience-step', title: 'Pet Experience' },
      { step: 4, testId: 'preferences-step', title: 'Preferences' },
      { step: 5, testId: 'review-step', title: 'Review & Submit' },
    ];

    stepTestCases.forEach(({ step, testId, title }) => {
      it(`should render ${title} step (step ${step}) correctly`, () => {
        mockUseAdoptionApplication.mockReturnValue({
          ...mockAdoptionHook,
          currentStep: step,
        });

        renderWithProviders(
          <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
        );

        expect(screen.getByTestId(testId)).toBeTruthy();
        expect(screen.getByText(`Step ${step} of 5`)).toBeTruthy();
        expect(screen.getByText(title)).toBeTruthy();
      });
    });

    it('should pass correct data to form step components', () => {
      const formData = {
        personalInfo: { firstName: 'John', lastName: 'Doe' },
        livingSituation: { housingType: 'house' },
      };

      mockUseApplicationForm.mockReturnValue({
        ...mockFormHook,
        formData,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByTestId('personal-info-data')).toHaveTextContent(
        JSON.stringify(formData.personalInfo)
      );
    });

    it('should handle form data updates from step components', async () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByTestId('update-personal-info'));

      await waitFor(() => {
        expect(mockFormHook.updateFormData).toHaveBeenCalledWith('personalInfo', {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });
      });

      expect(mockFormHook.saveAsyncDraft).toHaveBeenCalled();
    });
  });

  describe('Application Submission', () => {
    beforeEach(() => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 5,
      });
    });

    it('should handle successful application submission', async () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByTestId('submit-application'));

      await waitFor(() => {
        expect(mockAdoptionHook.submitApplication).toHaveBeenCalled();
      });

      expect(mockAnalytics.trackFormSubmission).toHaveBeenCalledWith(
        'adoption_application',
        'submitted',
        { petId: 'pet-123', petName: 'Buddy' }
      );
    });

    it('should show loading state during submission', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 5,
        isSubmitting: true,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      const submitButton = screen.getByText('Submit Application');
      expect(submitButton.parent?.props.style).toEqual(
        expect.objectContaining({ opacity: 0.5 })
      );
    });

    it('should display submission error when submission fails', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 5,
        submitError: 'Network error occurred',
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Network error occurred')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('should handle retry submission after error', () => {
      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 5,
        submitError: 'Network error occurred',
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByText('Try Again'));

      expect(mockAdoptionHook.clearError).toHaveBeenCalled();
    });
  });

  describe('Draft Management', () => {
    it('should show draft status indicator', () => {
      mockUseApplicationForm.mockReturnValue({
        ...mockFormHook,
        draftStatus: 'saving',
        hasUnsavedChanges: true,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Saving...')).toBeTruthy();
    });

    it('should show unsaved changes warning', () => {
      mockUseApplicationForm.mockReturnValue({
        ...mockFormHook,
        hasUnsavedChanges: true,
        draftStatus: 'saved',
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('You have unsaved changes')).toBeTruthy();
    });

    it('should auto-save form data after changes', async () => {
      jest.useFakeTimers();

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByTestId('update-personal-info'));

      // Fast-forward auto-save timer
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockFormHook.saveAsyncDraft).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle pet data loading error', () => {
      mockUseGetPetByIdQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Pet not found' },
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Unable to load pet information')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('should handle retry after pet loading error', () => {
      const mockRefetch = jest.fn();
      mockUseGetPetByIdQuery.mockReturnValue({
        ...createMockQueryResponse(undefined, false),
        isError: true,
        error: { message: 'Pet not found' },
        refetch: mockRefetch,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByText('Try Again'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show general error fallback for unexpected errors', () => {
      // Simulate component error
      mockUseApplicationForm.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Please try again later')).toBeTruthy();
    });
  });

  describe('Navigation Integration', () => {
    it('should handle back button press with unsaved changes', () => {
      mockUseApplicationForm.mockReturnValue({
        ...mockFormHook,
        hasUnsavedChanges: true,
      });

      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Simulate Android back button
      const backHandler = require('react-native').BackHandler;
      backHandler.mockPressBack();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Unsaved Changes',
        expect.stringContaining('You have unsaved changes'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Stay' }),
          expect.objectContaining({ text: 'Leave', style: 'destructive' }),
        ])
      );
    });

    it('should navigate back without warning when no unsaved changes', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Simulate Android back button
      const backHandler = require('react-native').BackHandler;
      backHandler.mockPressBack();

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      unmount();

      // Verify cleanup was called (auto-save timers, listeners, etc.)
      expect(mockFormHook.saveAsyncDraft).toHaveBeenCalledWith(true); // final save on unmount
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for navigation', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      const nextButton = screen.getByText('Next');
      expect(nextButton.props.accessibilityLabel).toBe('Go to next step: Living Situation');
    });

    it('should announce step changes for screen readers', async () => {
      const { rerender } = renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      mockUseAdoptionApplication.mockReturnValue({
        ...mockAdoptionHook,
        currentStep: 2,
      });

      rerender(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(screen.getByTestId('step-announcement')).toHaveTextContent(
        'Step 2 of 5: Living Situation'
      );
    });

    it('should have proper heading hierarchy', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      const mainHeading = screen.getByText('Adopt Buddy');
      expect(mainHeading.props.accessibilityRole).toBe('header');
      expect(mainHeading.props.accessibilityLevel).toBe(1);

      const stepHeading = screen.getByText('Personal Information');
      expect(stepHeading.props.accessibilityRole).toBe('header');
      expect(stepHeading.props.accessibilityLevel).toBe(2);
    });
  });

  describe('Analytics Integration', () => {
    it('should track screen view on mount', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(mockAnalytics.trackScreenView).toHaveBeenCalledWith(
        'AdoptionApplicationScreen',
        {
          petId: 'pet-123',
          petName: 'Buddy',
          step: 1,
          stepName: 'Personal Information',
        }
      );
    });

    it('should track step completion analytics', async () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(mockAnalytics.trackFormInteraction).toHaveBeenCalledWith(
          'adoption_application',
          'step_completed',
          {
            step: 1,
            stepName: 'Personal Information',
            timeSpent: expect.any(Number),
          }
        );
      });
    });

    it('should track form abandonment on back navigation', () => {
      renderWithProviders(
        <AdoptionApplicationScreen route={mockRoute} navigation={mockNavigation} />
      );

      mockNavigation.goBack();

      expect(mockAnalytics.trackFormAbandonment).toHaveBeenCalledWith(
        'adoption_application',
        {
          currentStep: 1,
          completionPercentage: 20,
          petId: 'pet-123',
        }
      );
    });
  });
});