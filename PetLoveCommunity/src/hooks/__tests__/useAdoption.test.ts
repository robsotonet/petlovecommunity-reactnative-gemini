// Pet Love Community - Adoption Hooks Tests
// Comprehensive test suite for adoption workflow hooks and state management

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import {
  usePetFavorites,
  useAdoptionApplication,
  useApplicationForm,
} from '../useAdoption';
import petSlice from '../../features/pets/petSlice';
import adoptionService from '../../services/adoptionService';
import { useAnalyticsTracker } from '../useAnalytics';

// Mock dependencies
jest.mock('../../services/adoptionService');
jest.mock('../useAnalytics');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockAdoptionService = adoptionService as jest.Mocked<typeof adoptionService>;
const mockUseAnalyticsTracker = useAnalyticsTracker as jest.MockedFunction<typeof useAnalyticsTracker>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

// Test store setup
const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      pets: petSlice,
    },
    preloadedState,
  });
};

// Wrapper component for hooks that need Redux
const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
};

// Mock analytics tracker
const mockAnalytics = {
  trackUserAction: jest.fn(),
  trackFormInteraction: jest.fn(),
  trackFormSubmission: jest.fn(),
  trackFormAbandonment: jest.fn(),
  trackScreenView: jest.fn(),
  trackPetView: jest.fn(),
  trackPetInteraction: jest.fn(),
};

describe('Adoption Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalyticsTracker.mockReturnValue(mockAnalytics);
  });

  describe('usePetFavorites', () => {
    let store: ReturnType<typeof createTestStore>;
    let wrapper: React.ComponentType<{ children: React.ReactNode }>;

    beforeEach(() => {
      store = createTestStore();
      wrapper = createWrapper(store);
    });

    describe('addToFavorites', () => {
      it('should add pet to favorites successfully', async () => {
        mockAdoptionService.addToFavorites.mockResolvedValue({
          success: true,
          correlationId: 'test-correlation-id',
        });

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.addToFavorites('pet-123', 'Buddy');
        });

        expect(mockAdoptionService.addToFavorites).toHaveBeenCalledWith('pet-123');
        expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith('pet_favorited', {
          petId: 'pet-123',
          petName: 'Buddy',
        });
      });

      it('should handle add to favorites error', async () => {
        mockAdoptionService.addToFavorites.mockResolvedValue({
          success: false,
          error: 'Failed to add to favorites',
        });

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.addToFavorites('pet-123');
        });

        expect(mockAlert).toHaveBeenCalledWith(
          'Unable to Favorite',
          'Failed to add to favorites',
          [{ text: 'OK' }]
        );
      });

      it('should handle network error gracefully', async () => {
        mockAdoptionService.addToFavorites.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.addToFavorites('pet-123');
        });

        expect(mockAlert).toHaveBeenCalledWith(
          'Unable to Favorite',
          'Network error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });

    describe('removeFromFavorites', () => {
      it('should remove pet from favorites successfully', async () => {
        // Pre-populate favorites
        store = createTestStore({
          pets: {
            favorites: [{ petId: 'pet-123', userId: 'user-123', favoritedAt: '2024-01-01T00:00:00Z' }],
          },
        });
        wrapper = createWrapper(store);

        mockAdoptionService.removeFromFavorites.mockResolvedValue({
          success: true,
          correlationId: 'test-correlation-id',
        });

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.removeFromFavorites('pet-123', 'Buddy');
        });

        expect(mockAdoptionService.removeFromFavorites).toHaveBeenCalledWith('pet-123');
        expect(mockAnalytics.trackUserAction).toHaveBeenCalledWith('pet_unfavorited', {
          petId: 'pet-123',
          petName: 'Buddy',
        });
      });

      it('should handle remove from favorites error', async () => {
        mockAdoptionService.removeFromFavorites.mockResolvedValue({
          success: false,
          error: 'Failed to remove from favorites',
        });

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.removeFromFavorites('pet-123');
        });

        expect(mockAlert).toHaveBeenCalledWith(
          'Unable to Remove Favorite',
          'Failed to remove from favorites',
          [{ text: 'OK' }]
        );
      });
    });

    describe('toggleFavorite', () => {
      it('should add to favorites when not favorited', async () => {
        mockAdoptionService.addToFavorites.mockResolvedValue({ success: true });

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.toggleFavorite('pet-123', 'Buddy');
        });

        expect(mockAdoptionService.addToFavorites).toHaveBeenCalledWith('pet-123');
      });

      it('should remove from favorites when already favorited', async () => {
        // Pre-populate favorites
        store = createTestStore({
          pets: {
            favorites: [{ petId: 'pet-123', userId: 'user-123', favoritedAt: '2024-01-01T00:00:00Z' }],
          },
        });
        wrapper = createWrapper(store);

        mockAdoptionService.removeFromFavorites.mockResolvedValue({ success: true });

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        await act(async () => {
          await result.current.toggleFavorite('pet-123', 'Buddy');
        });

        expect(mockAdoptionService.removeFromFavorites).toHaveBeenCalledWith('pet-123');
      });
    });

    describe('state and derived values', () => {
      it('should return correct favorites state', () => {
        const favorites = [{ petId: 'pet-123', userId: 'user-123', favoritedAt: '2024-01-01T00:00:00Z' }];
        store = createTestStore({ pets: { favorites } });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        expect(result.current.favorites).toEqual(favorites);
        expect(result.current.favoritesCount).toBe(1);
        expect(result.current.isFavorited('pet-123')).toBe(true);
        expect(result.current.isFavorited('pet-456')).toBe(false);
      });

      it('should return pending operations state', () => {
        const pendingOps = [
          {
            id: 'op-1',
            operation: 'add' as const,
            petId: 'pet-123',
            timestamp: '2024-01-01T00:00:00Z',
            correlationId: 'corr-123',
          },
        ];
        store = createTestStore({ pets: { pendingFavoriteOperations: pendingOps } });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        expect(result.current.pendingOperations).toEqual(pendingOps);
        expect(result.current.hasPendingOperation('pet-123')).toBe(true);
        expect(result.current.hasPendingOperation('pet-456')).toBe(false);
      });

      it('should handle offline state correctly', () => {
        store = createTestStore({ pets: { isOnline: false } });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => usePetFavorites(), { wrapper });

        expect(result.current.isOnline).toBe(false);
      });
    });
  });

  describe('useAdoptionApplication', () => {
    let store: ReturnType<typeof createTestStore>;
    let wrapper: React.ComponentType<{ children: React.ReactNode }>;

    beforeEach(() => {
      store = createTestStore();
      wrapper = createWrapper(store);
    });

    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submitError).toBeNull();
      expect(result.current.completionPercentage).toBe(0);
    });

    it('should start new application', async () => {
      const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

      await act(async () => {
        result.current.startApplication('Buddy');
      });

      expect(result.current.currentStep).toBe(1);
      expect(mockAnalytics.trackFormInteraction).toHaveBeenCalledWith(
        'adoption_application',
        'started',
        { petId: 'pet-123', petName: 'Buddy' }
      );
    });

    describe('step navigation', () => {
      it('should advance to next step', () => {
        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        act(() => {
          result.current.goToNextStep();
        });

        expect(result.current.currentStep).toBe(2);
      });

      it('should not advance beyond final step', () => {
        store = createTestStore({
          pets: {
            currentApplication: { step: 5, petId: 'pet-123', isSubmitting: false, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        act(() => {
          result.current.goToNextStep();
        });

        expect(result.current.currentStep).toBe(5);
      });

      it('should go to previous step', () => {
        store = createTestStore({
          pets: {
            currentApplication: { step: 3, petId: 'pet-123', isSubmitting: false, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        act(() => {
          result.current.goToPreviousStep();
        });

        expect(result.current.currentStep).toBe(2);
      });

      it('should not go before first step', () => {
        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        act(() => {
          result.current.goToPreviousStep();
        });

        expect(result.current.currentStep).toBe(1);
      });
    });

    describe('application submission', () => {
      it('should submit application successfully', async () => {
        mockAdoptionService.submitApplication.mockResolvedValue({
          success: true,
          applicationId: 'app-123',
        });

        store = createTestStore({
          pets: {
            currentApplication: { step: 5, petId: 'pet-123', isSubmitting: false, submitError: null },
            drafts: {
              'draft-pet-123': {
                id: 'draft-pet-123',
                petId: 'pet-123',
                formData: { personalInfo: { firstName: 'John' } },
              },
            },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        await act(async () => {
          await result.current.submitApplication();
        });

        expect(mockAdoptionService.submitApplication).toHaveBeenCalledWith('pet-123', {
          personalInfo: { firstName: 'John' },
        });
        expect(mockAnalytics.trackFormSubmission).toHaveBeenCalledWith(
          'adoption_application',
          'submitted',
          expect.objectContaining({ petId: 'pet-123' })
        );
      });

      it('should handle submission error', async () => {
        mockAdoptionService.submitApplication.mockResolvedValue({
          success: false,
          error: 'Submission failed',
        });

        store = createTestStore({
          pets: {
            currentApplication: { step: 5, petId: 'pet-123', isSubmitting: false, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        await act(async () => {
          await result.current.submitApplication();
        });

        expect(result.current.submitError).toBe('Submission failed');
        expect(result.current.isSubmitting).toBe(false);
      });

      it('should handle network error during submission', async () => {
        mockAdoptionService.submitApplication.mockRejectedValue(new Error('Network error'));

        store = createTestStore({
          pets: {
            currentApplication: { step: 5, petId: 'pet-123', isSubmitting: false, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        await act(async () => {
          await result.current.submitApplication();
        });

        expect(result.current.submitError).toBe('Network error occurred. Please try again.');
      });

      it('should prevent submission when not on final step', async () => {
        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        await act(async () => {
          await result.current.submitApplication();
        });

        expect(mockAdoptionService.submitApplication).not.toHaveBeenCalled();
      });
    });

    describe('derived state', () => {
      it('should calculate completion percentage correctly', () => {
        store = createTestStore({
          pets: {
            currentApplication: { step: 3, petId: 'pet-123', isSubmitting: false, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        expect(result.current.completionPercentage).toBe(60); // (3/5) * 100
      });

      it('should determine canProceed based on validation and submission state', () => {
        store = createTestStore({
          pets: {
            currentApplication: { step: 2, petId: 'pet-123', isSubmitting: true, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        expect(result.current.canProceed).toBe(false); // Can't proceed while submitting
      });

      it('should identify final step correctly', () => {
        store = createTestStore({
          pets: {
            currentApplication: { step: 5, petId: 'pet-123', isSubmitting: false, submitError: null },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

        expect(result.current.isLastStep).toBe(true);
      });
    });

    it('should clear errors', () => {
      store = createTestStore({
        pets: {
          currentApplication: { step: 3, petId: 'pet-123', isSubmitting: false, submitError: 'Some error' },
        },
      });
      wrapper = createWrapper(store);

      const { result } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.submitError).toBeNull();
    });
  });

  describe('useApplicationForm', () => {
    let store: ReturnType<typeof createTestStore>;
    let wrapper: React.ComponentType<{ children: React.ReactNode }>;

    beforeEach(() => {
      store = createTestStore();
      wrapper = createWrapper(store);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should initialize with empty form data', () => {
      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      expect(result.current.formData).toEqual({});
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.draftStatus).toBe('saved');
    });

    it('should update form data and mark as unsaved', async () => {
      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      await act(async () => {
        result.current.updateFormData('personalInfo', {
          firstName: 'John',
          lastName: 'Doe',
        });
      });

      expect(result.current.formData.personalInfo).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should auto-save draft after changes', async () => {
      mockAdoptionService.saveDraft.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      await act(async () => {
        result.current.updateFormData('personalInfo', { firstName: 'John' });
      });

      // Fast-forward auto-save timer
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockAdoptionService.saveDraft).toHaveBeenCalledWith('pet-123', {
          personalInfo: { firstName: 'John' },
        });
      });

      expect(result.current.draftStatus).toBe('saved');
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should handle draft save errors', async () => {
      mockAdoptionService.saveDraft.mockResolvedValue({
        success: false,
        error: 'Save failed',
      });

      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      await act(async () => {
        result.current.updateFormData('personalInfo', { firstName: 'John' });
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.draftStatus).toBe('error');
      });
    });

    describe('form validation', () => {
      it('should validate personal info step', () => {
        store = createTestStore({
          pets: {
            drafts: {
              'draft-pet-123': {
                id: 'draft-pet-123',
                formData: {
                  personalInfo: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '555-0123',
                    address: '123 Main St',
                    dateOfBirth: '1990-01-01',
                  },
                },
              },
            },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

        expect(result.current.validateCurrentStep(1)).toBe(true);
      });

      it('should fail validation with missing required fields', () => {
        store = createTestStore({
          pets: {
            drafts: {
              'draft-pet-123': {
                id: 'draft-pet-123',
                formData: {
                  personalInfo: {
                    firstName: 'John',
                    // Missing required fields
                  },
                },
              },
            },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

        expect(result.current.validateCurrentStep(1)).toBe(false);
      });

      it('should validate living situation step', () => {
        store = createTestStore({
          pets: {
            drafts: {
              'draft-pet-123': {
                id: 'draft-pet-123',
                formData: {
                  livingSituation: {
                    housingType: 'house',
                    ownOrRent: 'own',
                    yardType: 'large',
                  },
                },
              },
            },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

        expect(result.current.validateCurrentStep(2)).toBe(true);
      });

      it('should validate experience step', () => {
        store = createTestStore({
          pets: {
            drafts: {
              'draft-pet-123': {
                id: 'draft-pet-123',
                formData: {
                  experience: {
                    previousPets: true,
                    petExperience: 'Had dogs for 10 years',
                    currentPets: [],
                  },
                },
              },
            },
          },
        });
        wrapper = createWrapper(store);

        const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

        expect(result.current.validateCurrentStep(3)).toBe(true);
      });
    });

    it('should manually save draft', async () => {
      mockAdoptionService.saveDraft.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      await act(async () => {
        result.current.updateFormData('personalInfo', { firstName: 'John' });
        await result.current.saveAsyncDraft();
      });

      expect(mockAdoptionService.saveDraft).toHaveBeenCalled();
      expect(result.current.draftStatus).toBe('saved');
    });

    it('should force save draft on final save', async () => {
      mockAdoptionService.saveDraft.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      await act(async () => {
        result.current.updateFormData('personalInfo', { firstName: 'John' });
        await result.current.saveAsyncDraft(true); // Force save
      });

      expect(mockAdoptionService.saveDraft).toHaveBeenCalled();
    });

    it('should clear form data', () => {
      store = createTestStore({
        pets: {
          drafts: {
            'draft-pet-123': {
              id: 'draft-pet-123',
              formData: { personalInfo: { firstName: 'John' } },
            },
          },
        },
      });
      wrapper = createWrapper(store);

      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      act(() => {
        result.current.clearForm();
      });

      expect(result.current.formData).toEqual({});
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should load existing draft on mount', () => {
      const existingFormData = {
        personalInfo: { firstName: 'John', lastName: 'Doe' },
      };

      store = createTestStore({
        pets: {
          drafts: {
            'draft-pet-123': {
              id: 'draft-pet-123',
              formData: existingFormData,
            },
          },
        },
      });
      wrapper = createWrapper(store);

      const { result } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      expect(result.current.formData).toEqual(existingFormData);
    });
  });

  describe('Integration tests', () => {
    it('should coordinate between adoption application and form hooks', async () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result: applicationResult } = renderHook(() => useAdoptionApplication('pet-123'), { wrapper });
      const { result: formResult } = renderHook(() => useApplicationForm('pet-123'), { wrapper });

      // Start application
      await act(async () => {
        applicationResult.current.startApplication('Buddy');
      });

      // Update form data
      await act(async () => {
        formResult.current.updateFormData('personalInfo', { firstName: 'John' });
      });

      // Navigate to next step
      act(() => {
        applicationResult.current.goToNextStep();
      });

      expect(applicationResult.current.currentStep).toBe(2);
      expect(formResult.current.formData.personalInfo?.firstName).toBe('John');
    });
  });
});