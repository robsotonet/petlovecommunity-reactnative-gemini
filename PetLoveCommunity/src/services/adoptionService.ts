// Pet Love Community - Adoption Service
// Business logic layer for pet adoption workflow with enterprise patterns

import { store } from '../store';
import { petApi } from './petApi';
import correlationIdService from './correlationIdService';
import { idempotencyService } from './idempotencyService';
import { loggingService } from './loggingService';
import {
  addFavoriteOptimistic,
  removeFavoriteOptimistic,
  completeFavoriteOperation,
  setApplicationSubmitting,
  setApplicationError,
  completeApplication,
  updateApplicationDraft,
  setOnlineStatus,
} from '../features/pets/petSlice';
import type { AdoptionApplication, PetFavorite } from '../types/pet';

interface FavoriteOperationResult {
  success: boolean;
  correlationId: string;
  error?: string;
}

interface ApplicationSubmissionResult {
  success: boolean;
  applicationId?: string;
  correlationId: string;
  error?: string;
}

class AdoptionService {
  private favoriteQueue: Array<{
    operation: 'add' | 'remove';
    petId: string;
    correlationId: string;
    timestamp: number;
  }> = [];

  /**
   * Add pet to favorites with optimistic updates and offline support
   */
  async addToFavorites(petId: string, notes?: string): Promise<FavoriteOperationResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    const idempotencyKey = await idempotencyService.generateKey('favorite_add', { petId });

    try {
      loggingService.info('AdoptionService: Adding pet to favorites', {
        correlationId,
        petId,
        idempotencyKey,
      });

      // Dispatch optimistic update immediately
      store.dispatch(addFavoriteOptimistic({ petId, correlationId }));

      // Attempt API call
      try {
        const result = await store.dispatch(
          petApi.endpoints.addPetToFavorites.initiate({ petId, notes }, {
            fixedCacheKey: idempotencyKey,
          })
        ).unwrap();

        // Mark operation as successful
        store.dispatch(completeFavoriteOperation({ correlationId, success: true }));

        loggingService.info('AdoptionService: Successfully added pet to favorites', {
          correlationId,
          petId,
        });

        return {
          success: true,
          correlationId,
        };

      } catch (apiError) {
        // Check if we're offline
        const isNetworkError = this.isNetworkError(apiError);
        
        if (isNetworkError) {
          // Queue for retry when back online
          this.queueFavoriteOperation('add', petId, correlationId);
          
          loggingService.warn('AdoptionService: Queued favorite operation for retry', {
            correlationId,
            petId,
            operation: 'add',
          });

          // Keep optimistic update, don't mark as failed
          return {
            success: true, // From user perspective, it succeeded
            correlationId,
          };
        } else {
          // Actual API error, revert optimistic update
          store.dispatch(completeFavoriteOperation({ correlationId, success: false }));
          throw apiError;
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add favorite';
      
      loggingService.error('AdoptionService: Failed to add pet to favorites', {
        correlationId,
        petId,
        error: errorMessage,
      });

      return {
        success: false,
        correlationId,
        error: errorMessage,
      };
    }
  }

  /**
   * Remove pet from favorites with optimistic updates and offline support
   */
  async removeFromFavorites(petId: string): Promise<FavoriteOperationResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    const idempotencyKey = await idempotencyService.generateKey('favorite_remove', { petId });

    try {
      loggingService.info('AdoptionService: Removing pet from favorites', {
        correlationId,
        petId,
        idempotencyKey,
      });

      // Dispatch optimistic update immediately
      store.dispatch(removeFavoriteOptimistic({ petId, correlationId }));

      // Attempt API call
      try {
        await store.dispatch(
          petApi.endpoints.removePetFromFavorites.initiate(petId, {
            fixedCacheKey: idempotencyKey,
          })
        ).unwrap();

        // Mark operation as successful
        store.dispatch(completeFavoriteOperation({ correlationId, success: true }));

        loggingService.info('AdoptionService: Successfully removed pet from favorites', {
          correlationId,
          petId,
        });

        return {
          success: true,
          correlationId,
        };

      } catch (apiError) {
        // Check if we're offline
        const isNetworkError = this.isNetworkError(apiError);
        
        if (isNetworkError) {
          // Queue for retry when back online
          this.queueFavoriteOperation('remove', petId, correlationId);
          
          loggingService.warn('AdoptionService: Queued favorite removal for retry', {
            correlationId,
            petId,
            operation: 'remove',
          });

          return {
            success: true, // From user perspective, it succeeded
            correlationId,
          };
        } else {
          // Actual API error, revert optimistic update
          store.dispatch(completeFavoriteOperation({ correlationId, success: false }));
          throw apiError;
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove favorite';
      
      loggingService.error('AdoptionService: Failed to remove pet from favorites', {
        correlationId,
        petId,
        error: errorMessage,
      });

      return {
        success: false,
        correlationId,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit adoption application with enterprise tracking
   */
  async submitAdoptionApplication(
    applicationData: Partial<AdoptionApplication>
  ): Promise<ApplicationSubmissionResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    const idempotencyKey = await idempotencyService.generateKey('application_submit', {
      petId: applicationData.petId,
    });

    try {
      store.dispatch(setApplicationSubmitting(true));

      loggingService.info('AdoptionService: Submitting adoption application', {
        correlationId,
        petId: applicationData.petId,
        idempotencyKey,
      });

      const result = await store.dispatch(
        petApi.endpoints.createAdoptionApplication.initiate(applicationData, {
          fixedCacheKey: idempotencyKey,
        })
      ).unwrap();

      if (result.success && result.data) {
        store.dispatch(completeApplication({
          petId: applicationData.petId!,
          applicationId: result.data.id,
        }));

        loggingService.info('AdoptionService: Successfully submitted adoption application', {
          correlationId,
          applicationId: result.data.id,
          petId: applicationData.petId,
        });

        return {
          success: true,
          applicationId: result.data.id,
          correlationId,
        };
      } else {
        throw new Error(result.message || 'Application submission failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      
      store.dispatch(setApplicationError(errorMessage));
      store.dispatch(setApplicationSubmitting(false));

      loggingService.error('AdoptionService: Failed to submit adoption application', {
        correlationId,
        petId: applicationData.petId,
        error: errorMessage,
      });

      return {
        success: false,
        correlationId,
        error: errorMessage,
      };
    }
  }

  /**
   * Auto-save application draft
   */
  async autoSaveApplicationDraft(
    draftId: string,
    formData: Partial<AdoptionApplication>,
    currentStep: number
  ): Promise<void> {
    try {
      store.dispatch(updateApplicationDraft({
        draftId,
        formData,
        step: currentStep,
        isAutoSaved: true,
      }));

      loggingService.debug('AdoptionService: Auto-saved application draft', {
        draftId,
        step: currentStep,
      });

    } catch (error) {
      loggingService.warn('AdoptionService: Failed to auto-save application draft', {
        draftId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Sync pending favorite operations when back online
   */
  async syncPendingOperations(): Promise<void> {
    if (this.favoriteQueue.length === 0) return;

    const correlationId = await correlationIdService.getCorrelationId();
    
    loggingService.info('AdoptionService: Syncing pending favorite operations', {
      correlationId,
      pendingOperations: this.favoriteQueue.length,
    });

    const operations = [...this.favoriteQueue];
    this.favoriteQueue = [];

    for (const operation of operations) {
      try {
        if (operation.operation === 'add') {
          await store.dispatch(
            petApi.endpoints.addPetToFavorites.initiate({ 
              petId: operation.petId 
            })
          ).unwrap();
        } else {
          await store.dispatch(
            petApi.endpoints.removePetFromFavorites.initiate(operation.petId)
          ).unwrap();
        }

        store.dispatch(completeFavoriteOperation({ 
          correlationId: operation.correlationId, 
          success: true 
        }));

      } catch (error) {
        // Re-queue failed operations
        this.favoriteQueue.push(operation);
        
        store.dispatch(completeFavoriteOperation({ 
          correlationId: operation.correlationId, 
          success: false 
        }));

        loggingService.error('AdoptionService: Failed to sync favorite operation', {
          correlationId,
          operation: operation.operation,
          petId: operation.petId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Handle network state changes
   */
  handleNetworkStateChange(isOnline: boolean): void {
    store.dispatch(setOnlineStatus(isOnline));

    if (isOnline) {
      // Sync pending operations when back online
      this.syncPendingOperations();
    }
  }

  /**
   * Private helper methods
   */
  private isNetworkError(error: any): boolean {
    // Check for common network error patterns
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status;
    
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorStatus === 0 ||
      errorStatus === 500 ||
      errorStatus === 502 ||
      errorStatus === 503 ||
      errorStatus === 504
    );
  }

  private queueFavoriteOperation(
    operation: 'add' | 'remove',
    petId: string,
    correlationId: string
  ): void {
    // Remove any existing operation for the same pet to avoid conflicts
    this.favoriteQueue = this.favoriteQueue.filter(op => op.petId !== petId);
    
    // Add new operation
    this.favoriteQueue.push({
      operation,
      petId,
      correlationId,
      timestamp: Date.now(),
    });
  }

  /**
   * Get adoption statistics
   */
  getAdoptionStatistics() {
    const state = store.getState();
    const petState = state.pets;
    
    return {
      favoritesCount: petState.favorites.length,
      applicationsCount: petState.applications.length,
      draftsCount: Object.keys(petState.drafts).length,
      pendingOperations: petState.pendingFavoriteOperations.length,
      adoptionFunnelStats: {
        viewedPets: petState.adoptionFunnel.viewedPets.length,
        favoritedPets: petState.adoptionFunnel.favoritedPets.length,
        startedApplications: petState.adoptionFunnel.startedApplications.length,
        submittedApplications: petState.adoptionFunnel.submittedApplications.length,
      },
    };
  }
}

// Export singleton instance
export const adoptionService = new AdoptionService();
export default adoptionService;