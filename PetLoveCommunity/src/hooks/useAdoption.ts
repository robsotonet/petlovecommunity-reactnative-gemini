// Pet Love Community - Adoption Hooks
// Custom hooks for pet adoption workflow with optimistic updates

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert } from 'react-native';
import adoptionService from '../services/adoptionService';
import { useAnalyticsTracker } from './useAnalytics';
import {
  selectFavorites,
  selectIsPetFavorited,
  selectCurrentApplication,
  selectDrafts,
  selectDraftByPetId,
  selectIsOnline,
  selectPendingFavoriteOperations,
  startAdoptionApplication,
  updateApplicationDraft,
  nextApplicationStep,
  previousApplicationStep,
  clearError,
} from '../features/pets/petSlice';
import type { RootState } from '../store';
import type { AdoptionApplication } from '../types/pet';

/**
 * Hook for managing pet favorites with offline support
 */
export const usePetFavorites = () => {
  const dispatch = useDispatch();
  const { trackUserAction } = useAnalyticsTracker();
  
  const favorites = useSelector(selectFavorites);
  const pendingOperations = useSelector(selectPendingFavoriteOperations);
  const isOnline = useSelector(selectIsOnline);

  const addToFavorites = useCallback(async (petId: string, petName?: string) => {
    try {
      trackUserAction('pet_favorited', { petId, petName });
      
      const result = await adoptionService.addToFavorites(petId);
      
      if (!result.success && result.error) {
        Alert.alert(
          'Unable to Favorite',
          result.error,
          [{ text: 'OK' }]
        );
      }
      
      return result;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return { success: false, correlationId: '', error: 'Unknown error' };
    }
  }, [trackUserAction]);

  const removeFromFavorites = useCallback(async (petId: string, petName?: string) => {
    try {
      trackUserAction('pet_unfavorited', { petId, petName });
      
      const result = await adoptionService.removeFromFavorites(petId);
      
      if (!result.success && result.error) {
        Alert.alert(
          'Unable to Remove Favorite',
          result.error,
          [{ text: 'OK' }]
        );
      }
      
      return result;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return { success: false, correlationId: '', error: 'Unknown error' };
    }
  }, [trackUserAction]);

  const isPetFavorited = useCallback((petId: string) => {
    return useSelector((state: RootState) => selectIsPetFavorited(state, petId));
  }, []);

  const getFavoritesPendingSync = useCallback(() => {
    return pendingOperations.filter(op => op.operation === 'add');
  }, [pendingOperations]);

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isPetFavorited,
    pendingOperations: pendingOperations.length,
    isOnline,
    getFavoritesPendingSync,
  };
};

/**
 * Hook for managing adoption applications
 */
export const useAdoptionApplication = () => {
  const dispatch = useDispatch();
  const { trackUserAction } = useAnalyticsTracker();
  
  const currentApplication = useSelector(selectCurrentApplication);
  const drafts = useSelector(selectDrafts);

  const startApplication = useCallback((petId: string, petName: string) => {
    trackUserAction('adoption_application_started', { petId, petName });
    dispatch(startAdoptionApplication({ petId, petName }));
  }, [dispatch, trackUserAction]);

  const updateDraft = useCallback((
    draftId: string,
    formData: Partial<AdoptionApplication>,
    step?: number
  ) => {
    dispatch(updateApplicationDraft({ draftId, formData, step }));
  }, [dispatch]);

  const autoSaveDraft = useCallback(async (
    draftId: string,
    formData: Partial<AdoptionApplication>,
    currentStep: number
  ) => {
    await adoptionService.autoSaveApplicationDraft(draftId, formData, currentStep);
  }, []);

  const nextStep = useCallback(() => {
    dispatch(nextApplicationStep());
  }, [dispatch]);

  const previousStep = useCallback(() => {
    dispatch(previousApplicationStep());
  }, [dispatch]);

  const submitApplication = useCallback(async (
    applicationData: Partial<AdoptionApplication>
  ) => {
    try {
      trackUserAction('adoption_application_submitted', { 
        petId: applicationData.petId,
      });
      
      const result = await adoptionService.submitAdoptionApplication(applicationData);
      
      if (result.success) {
        Alert.alert(
          'Application Submitted!',
          'Your adoption application has been submitted successfully. The shelter will contact you soon.',
          [{ text: 'OK' }]
        );
        
        trackUserAction('adoption_application_success', {
          petId: applicationData.petId,
          applicationId: result.applicationId,
        });
      } else {
        Alert.alert(
          'Submission Failed',
          result.error || 'Unable to submit application. Please try again.',
          [{ text: 'OK' }]
        );
        
        trackUserAction('adoption_application_failed', {
          petId: applicationData.petId,
          error: result.error,
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      return { success: false, correlationId: '', error: errorMessage };
    }
  }, [trackUserAction]);

  const getDraftByPetId = useCallback((petId: string) => {
    return useSelector((state: RootState) => selectDraftByPetId(state, petId));
  }, []);

  const clearApplicationError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    currentApplication,
    drafts: Object.values(drafts),
    startApplication,
    updateDraft,
    autoSaveDraft,
    nextStep,
    previousStep,
    submitApplication,
    getDraftByPetId,
    clearApplicationError,
  };
};

/**
 * Hook for adoption statistics and analytics
 */
export const useAdoptionStats = () => {
  const getStats = useCallback(() => {
    return adoptionService.getAdoptionStatistics();
  }, []);

  return {
    getStats,
  };
};

/**
 * Hook for managing application form steps
 */
export const useApplicationForm = (draftId: string) => {
  const dispatch = useDispatch();
  const currentApplication = useSelector(selectCurrentApplication);
  const draft = useSelector((state: RootState) => 
    selectDraftByPetId(state, currentApplication.petId || '')
  );

  const updateFormData = useCallback((
    stepData: Partial<AdoptionApplication>
  ) => {
    if (draft) {
      dispatch(updateApplicationDraft({
        draftId: draft.id,
        formData: stepData,
      }));
    }
  }, [dispatch, draft]);

  const getCurrentStepData = useCallback(() => {
    if (!draft) return null;
    
    const { formData } = draft;
    
    switch (currentApplication.step) {
      case 1:
        return formData.personalInfo;
      case 2:
        return formData.livingSituation;
      case 3:
        return formData.experience;
      case 4:
        return formData.preferences;
      case 5:
        return formData.additionalInfo;
      default:
        return null;
    }
  }, [draft, currentApplication.step]);

  const isStepValid = useCallback((step: number) => {
    if (!draft) return false;
    
    const { formData } = draft;
    
    switch (step) {
      case 1:
        return !!(
          formData.personalInfo?.firstName &&
          formData.personalInfo?.lastName &&
          formData.personalInfo?.email &&
          formData.personalInfo?.phone
        );
      case 2:
        return !!(
          formData.livingSituation?.housingType &&
          formData.livingSituation?.ownOrRent
        );
      case 3:
        return formData.experience?.previousPets !== undefined;
      case 4:
        return true; // Preferences are optional
      case 5:
        return true; // Additional info is optional
      default:
        return false;
    }
  }, [draft]);

  const getCompletionPercentage = useCallback(() => {
    return draft?.completionPercentage || 0;
  }, [draft]);

  return {
    currentStep: currentApplication.step,
    formData: draft?.formData,
    updateFormData,
    getCurrentStepData,
    isStepValid,
    getCompletionPercentage,
    isSubmitting: currentApplication.isSubmitting,
    submitError: currentApplication.submitError,
  };
};

export default {
  usePetFavorites,
  useAdoptionApplication,
  useAdoptionStats,
  useApplicationForm,
};