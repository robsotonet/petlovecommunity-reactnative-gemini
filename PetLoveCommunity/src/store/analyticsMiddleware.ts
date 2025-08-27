// Pet Love Community - Analytics Middleware
// Redux middleware for automatic analytics tracking

import { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import adoptionAnalyticsService from '../services/adoptionAnalyticsService';

// Action types that should trigger analytics events
const TRACKED_ACTIONS = {
  // Pet interactions
  'pets/setSelectedPet': 'pet_view',
  'pets/addFavoriteOptimistic': 'pet_interaction',
  'pets/removeFavoriteOptimistic': 'pet_interaction',
  
  // Adoption workflow
  'pets/startAdoptionApplication': 'adoption_funnel',
  'pets/updateApplicationDraft': 'form_analytics',
  'pets/nextApplicationStep': 'adoption_funnel',
  'pets/previousApplicationStep': 'adoption_funnel',
  'pets/completeApplication': 'adoption_funnel',
  
  // Search actions
  'pets/updateSearchFilters': 'search_analytics',
  'pets/addRecentSearch': 'search_analytics',
  
  // Draft synchronization
  'pets/setDraftSyncStatus': 'offline_event',
  'pets/createDraftBackup': 'offline_event',
  'pets/updateDraftFromServer': 'offline_event',
  'pets/resolveDraftConflict': 'offline_event',
} as const;

interface AnalyticsContext {
  startTimes: Record<string, number>;
  formStates: Record<string, any>;
  searchStates: Record<string, any>;
}

export const analyticsMiddleware: Middleware<{}, RootState> = (store) => {
  const context: AnalyticsContext = {
    startTimes: {},
    formStates: {},
    searchStates: {},
  };

  return (next) => (action) => {
    const state = store.getState();
    const result = next(action);
    const newState = store.getState();

    // Check if this action should be tracked
    const eventType = TRACKED_ACTIONS[action.type as keyof typeof TRACKED_ACTIONS];
    if (!eventType) {
      return result;
    }

    // Track the analytics event based on action type
    setTimeout(() => {
      try {
        trackActionAnalytics(action, state, newState, context, eventType);
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    }, 0);

    return result;
  };
};

async function trackActionAnalytics(
  action: any,
  prevState: RootState,
  newState: RootState,
  context: AnalyticsContext,
  eventType: string
): Promise<void> {
  switch (action.type) {
    case 'pets/setSelectedPet':
      await trackPetViewAction(action, prevState, newState);
      break;
      
    case 'pets/addFavoriteOptimistic':
    case 'pets/removeFavoriteOptimistic':
      await trackPetInteractionAction(action, prevState, newState);
      break;
      
    case 'pets/startAdoptionApplication':
      await trackAdoptionStartAction(action, prevState, newState, context);
      break;
      
    case 'pets/updateApplicationDraft':
      await trackFormUpdateAction(action, prevState, newState, context);
      break;
      
    case 'pets/nextApplicationStep':
    case 'pets/previousApplicationStep':
      await trackStepNavigationAction(action, prevState, newState, context);
      break;
      
    case 'pets/completeApplication':
      await trackAdoptionCompleteAction(action, prevState, newState, context);
      break;
      
    case 'pets/updateSearchFilters':
      await trackSearchFiltersAction(action, prevState, newState, context);
      break;
      
    case 'pets/addRecentSearch':
      await trackSearchQueryAction(action, prevState, newState);
      break;
      
    case 'pets/setDraftSyncStatus':
    case 'pets/createDraftBackup':
    case 'pets/updateDraftFromServer':
    case 'pets/resolveDraftConflict':
      await trackOfflineAction(action, prevState, newState);
      break;
  }
}

// Individual tracking functions
async function trackPetViewAction(action: any, prevState: RootState, newState: RootState): Promise<void> {
  const pet = action.payload;
  if (!pet) return;

  await adoptionAnalyticsService.trackPetView(pet.id, {
    petName: pet.name,
    source: 'direct', // Could be enhanced to track actual source
  });
}

async function trackPetInteractionAction(action: any, prevState: RootState, newState: RootState): Promise<void> {
  const { petId } = action.payload;
  const interactionType = action.type.includes('add') ? 'favorite' : 'unfavorite';
  
  await adoptionAnalyticsService.trackPetInteraction(petId, interactionType, {
    previousState: prevState.pets.favorites.some(f => f.petId === petId),
    newState: newState.pets.favorites.some(f => f.petId === petId),
  });
}

async function trackAdoptionStartAction(action: any, prevState: RootState, newState: RootState, context: AnalyticsContext): Promise<void> {
  const { petId, petName } = action.payload;
  const timestamp = Date.now();
  
  // Store start time for duration tracking
  context.startTimes[petId] = timestamp;
  
  await adoptionAnalyticsService.trackAdoptionFunnelStep(petId, 'application_start', {
    currentStep: 1,
    totalSteps: 5,
    completionPercentage: 0,
    timeSpent: 0,
    stepName: 'Personal Information',
  });
}

async function trackFormUpdateAction(action: any, prevState: RootState, newState: RootState, context: AnalyticsContext): Promise<void> {
  const { draftId, formData, step } = action.payload;
  const draft = newState.pets.drafts[draftId];
  
  if (!draft) return;

  // Store form state for comparison
  context.formStates[draftId] = {
    lastUpdate: Date.now(),
    formData: { ...formData },
    step: step,
    completionPercentage: draft.completionPercentage,
  };

  await adoptionAnalyticsService.trackFormAction('adoption_application', draftId, 'field_blur', {
    stepNumber: step,
    completionPercentage: draft.completionPercentage,
    formData: formData,
  });
}

async function trackStepNavigationAction(action: any, prevState: RootState, newState: RootState, context: AnalyticsContext): Promise<void> {
  const currentApp = newState.pets.currentApplication;
  if (!currentApp.petId) return;

  const isNext = action.type.includes('next');
  const currentStep = newState.pets.currentApplication.step;
  const startTime = context.startTimes[currentApp.petId] || Date.now();
  const timeSpent = Date.now() - startTime;

  await adoptionAnalyticsService.trackAdoptionFunnelStep(currentApp.petId, 'application_step', {
    currentStep: currentStep,
    totalSteps: 5,
    completionPercentage: calculateStepCompletion(currentStep),
    timeSpent: timeSpent,
    stepName: getStepName(currentStep),
  });
}

async function trackAdoptionCompleteAction(action: any, prevState: RootState, newState: RootState, context: AnalyticsContext): Promise<void> {
  const { petId, applicationId } = action.payload;
  const startTime = context.startTimes[petId] || Date.now();
  const totalTimeSpent = Date.now() - startTime;

  await adoptionAnalyticsService.trackAdoptionFunnelStep(petId, 'application_submit', {
    currentStep: 5,
    totalSteps: 5,
    completionPercentage: 100,
    timeSpent: totalTimeSpent,
    stepName: 'Application Submitted',
  });

  // Clean up tracking context
  delete context.startTimes[petId];
}

async function trackSearchFiltersAction(action: any, prevState: RootState, newState: RootState, context: AnalyticsContext): Promise<void> {
  const filters = action.payload;
  const searchId = 'current_search';
  
  // Store search context
  context.searchStates[searchId] = {
    filters: { ...newState.pets.searchFilters },
    timestamp: Date.now(),
  };

  // Note: Actual search results would be tracked when search is performed
  // This just tracks filter updates
}

async function trackSearchQueryAction(action: any, prevState: RootState, newState: RootState): Promise<void> {
  const query = action.payload;
  
  // Track search query addition (simplified - would need actual search results)
  await adoptionAnalyticsService.trackSearch(
    newState.pets.searchFilters,
    0, // Results count would come from actual search
    0, // Search time would be measured during search
    {
      query,
    }
  );
}

async function trackOfflineAction(action: any, prevState: RootState, newState: RootState): Promise<void> {
  const actionMap = {
    'pets/setDraftSyncStatus': 'sync_start',
    'pets/createDraftBackup': 'queue_event',
    'pets/updateDraftFromServer': 'sync_success',
    'pets/resolveDraftConflict': 'conflict_resolved',
  } as const;

  const offlineAction = actionMap[action.type as keyof typeof actionMap];
  if (!offlineAction) return;

  const queueSize = Object.keys(newState.pets.drafts).length;
  
  await adoptionAnalyticsService.trackOfflineEvent(offlineAction, {
    queueSize,
  });
}

// Helper functions
function calculateStepCompletion(step: number): number {
  return Math.round((step / 5) * 100);
}

function getStepName(step: number): string {
  const stepNames = {
    1: 'Personal Information',
    2: 'Living Situation',
    3: 'Experience & References',
    4: 'Documents',
    5: 'Review & Submit',
  };
  
  return stepNames[step as keyof typeof stepNames] || `Step ${step}`;
}

export default analyticsMiddleware;