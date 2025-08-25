// Pet Love Community - Pet Adoption State Management
// Enterprise Redux slice for pet adoption workflow and favorites

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { 
  Pet, 
  PetFavorite, 
  AdoptionApplication, 
  PetSearchRequest,
  PetStatus
} from '../../types/pet';
import { petApi } from '../../services/petApi';

// Adoption-specific interfaces
export interface AdoptionDraft {
  id: string;
  petId: string;
  petName: string;
  lastSaved: string;
  completionPercentage: number;
  currentStep: number;
  formData: Partial<AdoptionApplication>;
  isAutoSaved: boolean;
}

export interface AdoptionFilters {
  animalType?: string;
  size?: string;
  ageRange?: string;
  goodWithChildren?: boolean;
  maxDistance?: number;
  nearMe?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface PetState {
  // Favorites management
  favorites: PetFavorite[];
  favoritesLastSync: string | null;
  pendingFavoriteOperations: Array<{
    id: string;
    operation: 'add' | 'remove';
    petId: string;
    timestamp: string;
    correlationId: string;
  }>;

  // Adoption applications
  applications: AdoptionApplication[];
  drafts: Record<string, AdoptionDraft>;
  currentApplication: {
    petId: string | null;
    step: number;
    isSubmitting: boolean;
    submitError: string | null;
  };

  // Search and filters
  searchFilters: PetSearchRequest;
  recentSearches: string[];
  
  // Selected pet context
  selectedPet: Pet | null;
  
  // UI state
  adoptionStatus: 'idle' | 'submitting' | 'success' | 'error';
  lastError: string | null;
  
  // Offline support
  isOnline: boolean;
  lastSyncTimestamp: string | null;
  
  // Analytics tracking
  adoptionFunnel: {
    viewedPets: string[];
    favoritedPets: string[];
    startedApplications: string[];
    submittedApplications: string[];
  };
}

const initialState: PetState = {
  favorites: [],
  favoritesLastSync: null,
  pendingFavoriteOperations: [],
  
  applications: [],
  drafts: {},
  currentApplication: {
    petId: null,
    step: 1,
    isSubmitting: false,
    submitError: null,
  },

  searchFilters: {
    limit: 20,
    page: 1,
  },
  recentSearches: [],
  
  selectedPet: null,
  
  adoptionStatus: 'idle',
  lastError: null,
  
  isOnline: true,
  lastSyncTimestamp: null,
  
  adoptionFunnel: {
    viewedPets: [],
    favoritedPets: [],
    startedApplications: [],
    submittedApplications: [],
  },
};

const petSlice = createSlice({
  name: 'pets',
  initialState,
  reducers: {
    // Favorites management
    addFavoriteOptimistic: (state, action: PayloadAction<{ 
      petId: string; 
      correlationId: string; 
    }>) => {
      const { petId, correlationId } = action.payload;
      const existingFavorite = state.favorites.find(fav => fav.petId === petId);
      
      if (!existingFavorite) {
        // Add optimistic favorite
        state.favorites.push({
          petId,
          userId: '', // Will be filled by server response
          favoritedAt: new Date().toISOString(),
          notes: '',
        });
        
        // Track pending operation
        state.pendingFavoriteOperations.push({
          id: correlationId,
          operation: 'add',
          petId,
          timestamp: new Date().toISOString(),
          correlationId,
        });

        // Track in analytics funnel
        if (!state.adoptionFunnel.favoritedPets.includes(petId)) {
          state.adoptionFunnel.favoritedPets.push(petId);
        }
      }
    },

    removeFavoriteOptimistic: (state, action: PayloadAction<{ 
      petId: string; 
      correlationId: string; 
    }>) => {
      const { petId, correlationId } = action.payload;
      
      // Remove optimistic favorite
      state.favorites = state.favorites.filter(fav => fav.petId !== petId);
      
      // Track pending operation
      state.pendingFavoriteOperations.push({
        id: correlationId,
        operation: 'remove',
        petId,
        timestamp: new Date().toISOString(),
        correlationId,
      });
    },

    completeFavoriteOperation: (state, action: PayloadAction<{
      correlationId: string;
      success: boolean;
    }>) => {
      const { correlationId, success } = action.payload;
      const operationIndex = state.pendingFavoriteOperations.findIndex(
        op => op.correlationId === correlationId
      );

      if (operationIndex !== -1) {
        const operation = state.pendingFavoriteOperations[operationIndex];
        
        if (!success) {
          // Revert optimistic update on failure
          if (operation.operation === 'add') {
            state.favorites = state.favorites.filter(fav => fav.petId !== operation.petId);
          } else if (operation.operation === 'remove') {
            // Re-add the favorite (would need to reconstruct from server or cache)
            // This is a simplified revert - in production, you'd need more sophisticated handling
          }
        }
        
        // Remove from pending operations
        state.pendingFavoriteOperations.splice(operationIndex, 1);
        state.favoritesLastSync = new Date().toISOString();
      }
    },

    // Adoption application management
    startAdoptionApplication: (state, action: PayloadAction<{ petId: string; petName: string }>) => {
      const { petId, petName } = action.payload;
      const draftId = `draft_${petId}_${Date.now()}`;
      
      state.currentApplication = {
        petId,
        step: 1,
        isSubmitting: false,
        submitError: null,
      };
      
      state.drafts[draftId] = {
        id: draftId,
        petId,
        petName,
        lastSaved: new Date().toISOString(),
        completionPercentage: 0,
        currentStep: 1,
        formData: {
          petId,
          personalInfo: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            dateOfBirth: '',
          },
        },
        isAutoSaved: false,
      };

      // Track in analytics funnel
      if (!state.adoptionFunnel.startedApplications.includes(petId)) {
        state.adoptionFunnel.startedApplications.push(petId);
      }
    },

    updateApplicationDraft: (state, action: PayloadAction<{
      draftId: string;
      formData: Partial<AdoptionApplication>;
      step?: number;
      isAutoSaved?: boolean;
    }>) => {
      const { draftId, formData, step, isAutoSaved = false } = action.payload;
      const draft = state.drafts[draftId];
      
      if (draft) {
        draft.formData = { ...draft.formData, ...formData };
        draft.lastSaved = new Date().toISOString();
        draft.isAutoSaved = isAutoSaved;
        
        if (step !== undefined) {
          draft.currentStep = step;
          state.currentApplication.step = step;
        }
        
        // Calculate completion percentage
        draft.completionPercentage = calculateCompletionPercentage(draft.formData);
      }
    },

    nextApplicationStep: (state) => {
      if (state.currentApplication.step < 5) { // Assuming 5 steps total
        state.currentApplication.step += 1;
      }
    },

    previousApplicationStep: (state) => {
      if (state.currentApplication.step > 1) {
        state.currentApplication.step -= 1;
      }
    },

    setApplicationSubmitting: (state, action: PayloadAction<boolean>) => {
      state.currentApplication.isSubmitting = action.payload;
      state.adoptionStatus = action.payload ? 'submitting' : 'idle';
    },

    setApplicationError: (state, action: PayloadAction<string | null>) => {
      state.currentApplication.submitError = action.payload;
      state.lastError = action.payload;
      state.adoptionStatus = action.payload ? 'error' : 'idle';
    },

    completeApplication: (state, action: PayloadAction<{ 
      petId: string; 
      applicationId: string; 
    }>) => {
      const { petId, applicationId } = action.payload;
      
      state.adoptionStatus = 'success';
      state.currentApplication = {
        petId: null,
        step: 1,
        isSubmitting: false,
        submitError: null,
      };
      
      // Remove draft after successful submission
      Object.keys(state.drafts).forEach(draftId => {
        if (state.drafts[draftId].petId === petId) {
          delete state.drafts[draftId];
        }
      });

      // Track in analytics funnel
      if (!state.adoptionFunnel.submittedApplications.includes(petId)) {
        state.adoptionFunnel.submittedApplications.push(petId);
      }
    },

    // Search and filters
    updateSearchFilters: (state, action: PayloadAction<Partial<PetSearchRequest>>) => {
      state.searchFilters = { ...state.searchFilters, ...action.payload };
    },

    addRecentSearch: (state, action: PayloadAction<string>) => {
      const query = action.payload;
      if (query && !state.recentSearches.includes(query)) {
        state.recentSearches.unshift(query);
        // Keep only last 10 searches
        state.recentSearches = state.recentSearches.slice(0, 10);
      }
    },

    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },

    // Selected pet context
    setSelectedPet: (state, action: PayloadAction<Pet | null>) => {
      state.selectedPet = action.payload;
      
      // Track pet view in analytics
      if (action.payload && !state.adoptionFunnel.viewedPets.includes(action.payload.id)) {
        state.adoptionFunnel.viewedPets.push(action.payload.id);
      }
    },

    // Connectivity and sync
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (action.payload) {
        // When back online, update sync timestamp
        state.lastSyncTimestamp = new Date().toISOString();
      }
    },

    // Analytics
    resetAdoptionFunnel: (state) => {
      state.adoptionFunnel = {
        viewedPets: [],
        favoritedPets: [],
        startedApplications: [],
        submittedApplications: [],
      };
    },

    // Cleanup
    clearError: (state) => {
      state.lastError = null;
      state.currentApplication.submitError = null;
      state.adoptionStatus = 'idle';
    },
  },

  // Handle RTK Query actions
  extraReducers: (builder) => {
    builder
      // Handle getUserFavorites
      .addMatcher(
        petApi.endpoints.getUserFavorites.matchFulfilled,
        (state, action) => {
          state.favorites = action.payload;
          state.favoritesLastSync = new Date().toISOString();
        }
      )
      // Handle getUserApplications
      .addMatcher(
        petApi.endpoints.getUserApplications.matchFulfilled,
        (state, action) => {
          state.applications = action.payload;
        }
      );
  },
});

// Helper function to calculate form completion percentage
function calculateCompletionPercentage(formData: Partial<AdoptionApplication>): number {
  let completedFields = 0;
  let totalFields = 20; // Approximate total required fields
  
  // Personal info (6 fields)
  if (formData.personalInfo) {
    const personalFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'dateOfBirth'];
    completedFields += personalFields.filter(field => 
      formData.personalInfo?.[field as keyof typeof formData.personalInfo]
    ).length;
  }
  
  // Living situation (4 fields)
  if (formData.livingSituation) {
    const livingFields = ['housingType', 'ownOrRent', 'yardType'];
    completedFields += livingFields.filter(field =>
      formData.livingSituation?.[field as keyof typeof formData.livingSituation]
    ).length;
  }
  
  // Experience (basic check - 3 fields)
  if (formData.experience) {
    if (formData.experience.previousPets !== undefined) completedFields += 1;
    if (formData.experience.petExperience) completedFields += 1;
    if (formData.experience.currentPets) completedFields += 1;
  }
  
  return Math.round((completedFields / totalFields) * 100);
}

// Export actions
export const {
  addFavoriteOptimistic,
  removeFavoriteOptimistic,
  completeFavoriteOperation,
  startAdoptionApplication,
  updateApplicationDraft,
  nextApplicationStep,
  previousApplicationStep,
  setApplicationSubmitting,
  setApplicationError,
  completeApplication,
  updateSearchFilters,
  addRecentSearch,
  clearRecentSearches,
  setSelectedPet,
  setOnlineStatus,
  resetAdoptionFunnel,
  clearError,
} = petSlice.actions;

// Selectors
export const selectPetState = (state: RootState) => state.pets;
export const selectFavorites = (state: RootState) => state.pets.favorites;
export const selectPendingFavoriteOperations = (state: RootState) => state.pets.pendingFavoriteOperations;
export const selectApplications = (state: RootState) => state.pets.applications;
export const selectDrafts = (state: RootState) => state.pets.drafts;
export const selectCurrentApplication = (state: RootState) => state.pets.currentApplication;
export const selectSearchFilters = (state: RootState) => state.pets.searchFilters;
export const selectSelectedPet = (state: RootState) => state.pets.selectedPet;
export const selectAdoptionFunnel = (state: RootState) => state.pets.adoptionFunnel;
export const selectIsOnline = (state: RootState) => state.pets.isOnline;

// Memoized selectors
export const selectIsPetFavorited = createSelector(
  [selectFavorites, (_: RootState, petId: string) => petId],
  (favorites, petId) => favorites.some(fav => fav.petId === petId)
);

export const selectDraftByPetId = createSelector(
  [selectDrafts, (_: RootState, petId: string) => petId],
  (drafts, petId) => Object.values(drafts).find(draft => draft.petId === petId)
);

export const selectActiveDrafts = createSelector(
  [selectDrafts],
  (drafts) => Object.values(drafts).filter(draft => draft.completionPercentage > 0)
);

export const selectRecentlyViewedPets = createSelector(
  [selectAdoptionFunnel],
  (funnel) => funnel.viewedPets.slice(-5) // Last 5 viewed pets
);

export const selectAdoptionProgress = createSelector(
  [selectAdoptionFunnel],
  (funnel) => ({
    viewedCount: funnel.viewedPets.length,
    favoritedCount: funnel.favoritedPets.length,
    startedApplicationsCount: funnel.startedApplications.length,
    submittedApplicationsCount: funnel.submittedApplications.length,
    conversionRate: funnel.viewedPets.length > 0 
      ? (funnel.submittedApplications.length / funnel.viewedPets.length) * 100 
      : 0,
  })
);

export default petSlice.reducer;