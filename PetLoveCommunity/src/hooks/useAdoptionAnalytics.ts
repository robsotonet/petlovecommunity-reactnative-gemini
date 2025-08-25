// Pet Love Community - Adoption Analytics Hook
// Custom hook for easy analytics tracking in React components

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../features/pets/petSlice';
import adoptionAnalyticsService from '../services/adoptionAnalyticsService';
import type {
  PetViewEvent,
  PetInteractionEvent,
  AdoptionFunnelEvent,
  FormAnalyticsEvent,
  DocumentUploadEvent,
  SearchAnalyticsEvent,
} from '../services/adoptionAnalyticsService';

interface ViewTrackingState {
  startTime: number;
  petId: string;
  imageViews: string[];
  scrollPosition: number;
}

interface FormTrackingState {
  startTime: number;
  formId: string;
  currentField?: string;
  fieldStartTime?: number;
  stepNumber: number;
  completionPercentage: number;
}

export const useAdoptionAnalytics = () => {
  const isOnline = useSelector(selectIsOnline);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // View tracking state
  const viewTrackingRef = useRef<ViewTrackingState | null>(null);
  const formTrackingRef = useRef<FormTrackingState | null>(null);

  // Initialize analytics service
  const initialize = useCallback(async (userId: string) => {
    if (!isInitialized) {
      await adoptionAnalyticsService.initialize(userId);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Update online status
  useEffect(() => {
    adoptionAnalyticsService.setOnlineStatus(isOnline);
  }, [isOnline]);

  // Pet view tracking
  const startPetViewTracking = useCallback((petId: string) => {
    viewTrackingRef.current = {
      startTime: Date.now(),
      petId,
      imageViews: [],
      scrollPosition: 0,
    };
  }, []);

  const trackImageView = useCallback((imageUrl: string) => {
    if (viewTrackingRef.current) {
      viewTrackingRef.current.imageViews.push(imageUrl);
    }
  }, []);

  const updateScrollPosition = useCallback((position: number) => {
    if (viewTrackingRef.current) {
      viewTrackingRef.current.scrollPosition = Math.max(
        viewTrackingRef.current.scrollPosition,
        position
      );
    }
  }, []);

  const endPetViewTracking = useCallback(async (
    options: Partial<Omit<PetViewEvent, keyof PetViewEvent['viewDuration'] | 'imageViews' | 'scrollPosition'>> = {}
  ) => {
    if (!viewTrackingRef.current) return;

    const { startTime, petId, imageViews, scrollPosition } = viewTrackingRef.current;
    const viewDuration = Date.now() - startTime;

    await adoptionAnalyticsService.trackPetView(petId, {
      ...options,
      viewDuration,
      imageViews,
      scrollPosition,
    });

    viewTrackingRef.current = null;
  }, []);

  // Pet interaction tracking
  const trackPetInteraction = useCallback(async (
    petId: string,
    interactionType: PetInteractionEvent['interactionType'],
    options: {
      interactionValue?: string | number;
      previousState?: any;
      newState?: any;
    } = {}
  ) => {
    await adoptionAnalyticsService.trackPetInteraction(petId, interactionType, options);
  }, []);

  // Adoption funnel tracking
  const trackFunnelStep = useCallback(async (
    petId: string,
    funnelStep: AdoptionFunnelEvent['funnelStep'],
    stepDetails: AdoptionFunnelEvent['stepDetails'],
    options: {
      applicationId?: string;
      draftId?: string;
    } = {}
  ) => {
    await adoptionAnalyticsService.trackAdoptionFunnelStep(petId, funnelStep, stepDetails, options);
  }, []);

  // Form tracking
  const startFormTracking = useCallback((
    formId: string,
    formType: FormAnalyticsEvent['formType'],
    stepNumber: number = 1
  ) => {
    formTrackingRef.current = {
      startTime: Date.now(),
      formId,
      stepNumber,
      completionPercentage: 0,
    };

    adoptionAnalyticsService.trackFormAction(formType, formId, 'start', {
      stepNumber,
      completionPercentage: 0,
    });
  }, []);

  const trackFieldFocus = useCallback(async (
    fieldName: string,
    formType: FormAnalyticsEvent['formType']
  ) => {
    if (!formTrackingRef.current) return;

    // End previous field tracking if exists
    if (formTrackingRef.current.currentField && formTrackingRef.current.fieldStartTime) {
      await trackFieldBlur(formType);
    }

    formTrackingRef.current.currentField = fieldName;
    formTrackingRef.current.fieldStartTime = Date.now();

    await adoptionAnalyticsService.trackFormAction(formType, formTrackingRef.current.formId, 'field_focus', {
      fieldName,
      stepNumber: formTrackingRef.current.stepNumber,
      completionPercentage: formTrackingRef.current.completionPercentage,
    });
  }, []);

  const trackFieldBlur = useCallback(async (
    formType: FormAnalyticsEvent['formType'],
    fieldValue?: string
  ) => {
    if (!formTrackingRef.current || !formTrackingRef.current.currentField) return;

    const timeOnField = formTrackingRef.current.fieldStartTime
      ? Date.now() - formTrackingRef.current.fieldStartTime
      : 0;

    await adoptionAnalyticsService.trackFormAction(formType, formTrackingRef.current.formId, 'field_blur', {
      fieldName: formTrackingRef.current.currentField,
      fieldValue,
      timeOnField,
      stepNumber: formTrackingRef.current.stepNumber,
      completionPercentage: formTrackingRef.current.completionPercentage,
    });

    formTrackingRef.current.currentField = undefined;
    formTrackingRef.current.fieldStartTime = undefined;
  }, []);

  const trackValidationError = useCallback(async (
    fieldName: string,
    errorMessage: string,
    formType: FormAnalyticsEvent['formType']
  ) => {
    if (!formTrackingRef.current) return;

    await adoptionAnalyticsService.trackFormAction(formType, formTrackingRef.current.formId, 'validation_error', {
      fieldName,
      errorMessage,
      stepNumber: formTrackingRef.current.stepNumber,
      completionPercentage: formTrackingRef.current.completionPercentage,
    });
  }, []);

  const trackStepComplete = useCallback(async (
    formType: FormAnalyticsEvent['formType'],
    stepNumber: number,
    completionPercentage: number,
    formData?: any
  ) => {
    if (!formTrackingRef.current) return;

    formTrackingRef.current.stepNumber = stepNumber;
    formTrackingRef.current.completionPercentage = completionPercentage;

    await adoptionAnalyticsService.trackFormAction(formType, formTrackingRef.current.formId, 'step_complete', {
      stepNumber,
      completionPercentage,
      formData,
    });
  }, []);

  const trackFormAbandon = useCallback(async (
    formType: FormAnalyticsEvent['formType'],
    reason?: string
  ) => {
    if (!formTrackingRef.current) return;

    const timeSpent = Date.now() - formTrackingRef.current.startTime;

    await adoptionAnalyticsService.trackFormAction(formType, formTrackingRef.current.formId, 'abandon', {
      stepNumber: formTrackingRef.current.stepNumber,
      completionPercentage: formTrackingRef.current.completionPercentage,
      errorMessage: reason,
    });

    formTrackingRef.current = null;
  }, []);

  const trackFormSubmit = useCallback(async (
    formType: FormAnalyticsEvent['formType'],
    formData?: any
  ) => {
    if (!formTrackingRef.current) return;

    const timeSpent = Date.now() - formTrackingRef.current.startTime;

    await adoptionAnalyticsService.trackFormAction(formType, formTrackingRef.current.formId, 'submit', {
      stepNumber: formTrackingRef.current.stepNumber,
      completionPercentage: 100,
      formData,
    });

    formTrackingRef.current = null;
  }, []);

  // Document upload tracking
  const trackDocumentAction = useCallback(async (
    documentType: string,
    applicationId: string,
    action: DocumentUploadEvent['action'],
    options: {
      method?: 'camera' | 'gallery' | 'file_picker';
      fileSize?: number;
      fileType?: string;
      processingTime?: number;
      errorDetails?: string;
      retryCount?: number;
    } = {}
  ) => {
    await adoptionAnalyticsService.trackDocumentUpload(documentType, applicationId, action, options);
  }, []);

  // Search tracking
  const trackSearch = useCallback(async (
    filters: Record<string, any>,
    resultsCount: number,
    searchTime: number,
    options: {
      query?: string;
      location?: { latitude: number; longitude: number; radius?: number };
      sortBy?: string;
      selectedPetId?: string;
      selectedPosition?: number;
      refinements?: string[];
      noResultsReason?: string;
    } = {}
  ) => {
    await adoptionAnalyticsService.trackSearch(filters, resultsCount, searchTime, options);
  }, []);

  // Convenience methods for common adoption workflow events
  const trackAdoptionStart = useCallback(async (petId: string, applicationId?: string, draftId?: string) => {
    await trackFunnelStep(petId, 'application_start', {
      currentStep: 1,
      totalSteps: 5, // Adjust based on your form steps
      completionPercentage: 0,
      timeSpent: 0,
      stepName: 'Personal Information',
    }, { applicationId, draftId });
  }, [trackFunnelStep]);

  const trackAdoptionStepProgress = useCallback(async (
    petId: string,
    currentStep: number,
    totalSteps: number,
    completionPercentage: number,
    stepName: string,
    timeSpent: number,
    validationErrors: string[] = [],
    applicationId?: string,
    draftId?: string
  ) => {
    await trackFunnelStep(petId, 'application_step', {
      currentStep,
      totalSteps,
      completionPercentage,
      timeSpent,
      stepName,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    }, { applicationId, draftId });
  }, [trackFunnelStep]);

  const trackAdoptionComplete = useCallback(async (
    petId: string,
    applicationId: string,
    totalTimeSpent: number,
    draftId?: string
  ) => {
    await trackFunnelStep(petId, 'application_submit', {
      currentStep: 5, // Final step
      totalSteps: 5,
      completionPercentage: 100,
      timeSpent: totalTimeSpent,
      stepName: 'Application Submitted',
    }, { applicationId, draftId });
  }, [trackFunnelStep]);

  // Analytics insights
  const getSessionSummary = useCallback(async () => {
    return await adoptionAnalyticsService.getSessionSummary();
  }, []);

  // Cleanup
  const cleanup = useCallback(async () => {
    // End any active tracking
    if (viewTrackingRef.current) {
      await endPetViewTracking();
    }
    
    if (formTrackingRef.current) {
      await trackFormAbandon('adoption_application', 'app_closed');
    }
  }, [endPetViewTracking, trackFormAbandon]);

  return {
    // Initialization
    initialize,
    isInitialized,
    
    // Pet view tracking
    startPetViewTracking,
    trackImageView,
    updateScrollPosition,
    endPetViewTracking,
    
    // Pet interactions
    trackPetInteraction,
    
    // Adoption funnel
    trackFunnelStep,
    trackAdoptionStart,
    trackAdoptionStepProgress,
    trackAdoptionComplete,
    
    // Form tracking
    startFormTracking,
    trackFieldFocus,
    trackFieldBlur,
    trackValidationError,
    trackStepComplete,
    trackFormAbandon,
    trackFormSubmit,
    
    // Document uploads
    trackDocumentAction,
    
    // Search
    trackSearch,
    
    // Insights
    getSessionSummary,
    
    // Cleanup
    cleanup,
  };
};

export default useAdoptionAnalytics;