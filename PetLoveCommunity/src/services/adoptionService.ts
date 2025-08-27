// Pet Love Community - Adoption Service
// Business logic layer for pet adoption workflow with enterprise patterns

import { store } from '../store';
import { petApi } from './petApi';
import correlationIdService from './correlationIdService';
import { idempotencyService } from './idempotencyService';
import { loggingService } from './loggingService';
import networkService from './networkService';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

interface QueuedFavoriteOperation {
  id: string;
  operation: 'add' | 'remove';
  petId: string;
  correlationId: string;
  timestamp: number;
  retryCount: number;
  lastRetryAt?: number;
  notes?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

class AdoptionService {
  private static readonly QUEUE_STORAGE_KEY = '@PetLoveCommunity:FavoriteQueue';
  private static readonly RETRY_CONFIG: RetryConfig = {
    maxRetries: 5,
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 30000, // 30 seconds
    backoffMultiplier: 2,
  };

  private favoriteQueue: QueuedFavoriteOperation[] = [];
  private isInitialized = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private isProcessingQueue = false;
  private networkUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the adoption service with persistent queue
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadQueueFromStorage();
      this.startPeriodicSync();
      this.setupNetworkMonitoring();
      this.isInitialized = true;
      
      loggingService.info('AdoptionService: Initialized with queue and network monitoring', {
        queueSize: this.favoriteQueue.length,
        networkConnected: networkService.getIsConnected(),
        networkQuality: networkService.getConnectionQuality(),
      });
    } catch (error) {
      loggingService.error('AdoptionService: Failed to initialize', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Setup network monitoring for automatic sync
   */
  private setupNetworkMonitoring(): void {
    this.networkUnsubscribe = networkService.addNetworkChangeListener(
      async (networkInfo, previousState) => {
        // Update Redux state with network status
        store.dispatch(setOnlineStatus(networkInfo.isConnected && networkInfo.isInternetReachable === true));

        // Trigger sync when connection is restored
        if (!previousState.isConnected && networkInfo.isConnected && networkInfo.isInternetReachable) {
          loggingService.info('AdoptionService: Connection restored, triggering sync', {
            connectionType: networkInfo.connectionType,
            connectionQuality: networkService.getConnectionQuality(),
            queueSize: this.favoriteQueue.length,
          });

          // Wait a moment for connection to stabilize, then sync
          setTimeout(() => {
            if (!this.isProcessingQueue) {
              this.processPendingOperationsWithRetry();
            }
          }, 2000);
        }

        // Log connection quality changes for monitoring
        if (networkInfo.isConnected && previousState.isConnected) {
          const currentQuality = networkService.getConnectionQuality();
          loggingService.debug('AdoptionService: Network quality update', {
            connectionType: networkInfo.connectionType,
            quality: currentQuality,
            strength: networkInfo.strength,
          });
        }
      }
    );
  }

  /**
   * Load queued operations from persistent storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(AdoptionService.QUEUE_STORAGE_KEY);
      
      if (storedQueue) {
        const operations: QueuedFavoriteOperation[] = JSON.parse(storedQueue);
        this.favoriteQueue = operations.filter(op => {
          // Remove operations older than 7 days
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
          return Date.now() - op.timestamp < maxAge;
        });
        
        loggingService.info('AdoptionService: Loaded queue from storage', {
          totalOperations: operations.length,
          validOperations: this.favoriteQueue.length,
        });
      }
    } catch (error) {
      loggingService.warn('AdoptionService: Failed to load queue from storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.favoriteQueue = [];
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        AdoptionService.QUEUE_STORAGE_KEY,
        JSON.stringify(this.favoriteQueue)
      );
    } catch (error) {
      loggingService.warn('AdoptionService: Failed to save queue to storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Start periodic sync timer with adaptive intervals based on network quality
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    const getSyncInterval = (): number => {
      if (!networkService.getIsConnected()) {
        return 60000; // 1 minute when offline (will be triggered by network events anyway)
      }

      const quality = networkService.getConnectionQuality();
      switch (quality) {
        case 'excellent':
        case 'good':
          return 30000; // 30 seconds for good connections
        case 'fair':
          return 45000; // 45 seconds for fair connections
        case 'poor':
          return 60000; // 1 minute for poor connections
        default:
          return 60000; // Default to 1 minute
      }
    };

    const scheduleNextSync = () => {
      this.syncTimer = setTimeout(() => {
        if (networkService.getIsConnected() && networkService.getIsInternetReachable() && !this.isProcessingQueue) {
          this.processPendingOperationsWithRetry();
        }
        scheduleNextSync(); // Schedule the next sync
      }, getSyncInterval());
    };

    scheduleNextSync();
  }

  /**
   * Stop periodic sync timer
   */
  private stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Add pet to favorites with optimistic updates and offline support
   */
  async addToFavorites(petId: string, notes?: string): Promise<FavoriteOperationResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    
    // Check for rapid tap scenarios and duplicate operations
    const canProceed = await idempotencyService.canProceed('favorite_add', { petId });
    if (!canProceed.canProceed) {
      loggingService.warn('AdoptionService: Blocked duplicate favorite add operation', {
        correlationId,
        petId,
        reason: canProceed.reason,
        existingKey: canProceed.existingKey,
      });
      
      return {
        success: true, // From user perspective, it's already handled
        correlationId,
      };
    }

    const idempotencyKey = await idempotencyService.generateKey('favorite_add', { petId });
    
    // Mark as pending to prevent duplicates
    await idempotencyService.markPending(idempotencyKey, 'favorite_add', { petId, notes });

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
        await idempotencyService.removePending(idempotencyKey);
        await idempotencyService.markAsProcessed(idempotencyKey, 'favorite_add', { petId, notes });

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
          await this.queueFavoriteOperation('add', petId, correlationId, notes);
          
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
      
      // Clean up pending state on error
      await idempotencyService.removePending(idempotencyKey);
      
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
    
    // Check for rapid tap scenarios and duplicate operations
    const canProceed = await idempotencyService.canProceed('favorite_remove', { petId });
    if (!canProceed.canProceed) {
      loggingService.warn('AdoptionService: Blocked duplicate favorite remove operation', {
        correlationId,
        petId,
        reason: canProceed.reason,
        existingKey: canProceed.existingKey,
      });
      
      return {
        success: true, // From user perspective, it's already handled
        correlationId,
      };
    }

    const idempotencyKey = await idempotencyService.generateKey('favorite_remove', { petId });
    
    // Mark as pending to prevent duplicates
    await idempotencyService.markPending(idempotencyKey, 'favorite_remove', { petId });

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
        await idempotencyService.removePending(idempotencyKey);
        await idempotencyService.markAsProcessed(idempotencyKey, 'favorite_remove', { petId });

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
          await this.queueFavoriteOperation('remove', petId, correlationId);
          
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
      
      // Clean up pending state on error
      await idempotencyService.removePending(idempotencyKey);
      
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
   * Process pending operations with enhanced retry logic
   */
  async processPendingOperationsWithRetry(): Promise<void> {
    if (this.favoriteQueue.length === 0 || this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    const correlationId = await correlationIdService.getCorrelationId();
    
    loggingService.info('AdoptionService: Processing pending favorite operations', {
      correlationId,
      pendingOperations: this.favoriteQueue.length,
    });

    const operations = [...this.favoriteQueue];
    const failedOperations: QueuedFavoriteOperation[] = [];

    for (const operation of operations) {
      try {
        // Check if operation should be retried
        if (this.shouldRetryOperation(operation)) {
          await this.executeQueuedOperation(operation);
          
          // Remove successful operation from queue
          this.removeOperationFromQueue(operation.id);
          
          store.dispatch(completeFavoriteOperation({ 
            correlationId: operation.correlationId, 
            success: true 
          }));
        } else {
          // Operation exceeded retry limits
          loggingService.warn('AdoptionService: Operation exceeded retry limits', {
            operationId: operation.id,
            petId: operation.petId,
            retryCount: operation.retryCount,
          });
          
          this.removeOperationFromQueue(operation.id);
          store.dispatch(completeFavoriteOperation({ 
            correlationId: operation.correlationId, 
            success: false 
          }));
        }

      } catch (error) {
        // Update retry info and re-queue if within limits
        operation.retryCount++;
        operation.lastRetryAt = Date.now();
        
        if (operation.retryCount <= AdoptionService.RETRY_CONFIG.maxRetries) {
          failedOperations.push(operation);
        } else {
          // Give up on this operation
          this.removeOperationFromQueue(operation.id);
          store.dispatch(completeFavoriteOperation({ 
            correlationId: operation.correlationId, 
            success: false 
          }));
        }

        loggingService.error('AdoptionService: Failed to process favorite operation', {
          correlationId,
          operationId: operation.id,
          operation: operation.operation,
          petId: operation.petId,
          retryCount: operation.retryCount,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update queue with failed operations and save to storage
    this.favoriteQueue = [...this.favoriteQueue.filter(op => !operations.some(processed => processed.id === op.id)), ...failedOperations];
    await this.saveQueueToStorage();
    this.isProcessingQueue = false;
  }

  /**
   * Execute a queued operation
   */
  private async executeQueuedOperation(operation: QueuedFavoriteOperation): Promise<void> {
    const idempotencyKey = await idempotencyService.generateKey(
      `favorite_${operation.operation}_retry`, 
      { petId: operation.petId, operationId: operation.id }
    );

    if (operation.operation === 'add') {
      await store.dispatch(
        petApi.endpoints.addPetToFavorites.initiate({ 
          petId: operation.petId,
          notes: operation.notes,
        }, {
          fixedCacheKey: idempotencyKey,
        })
      ).unwrap();
    } else {
      await store.dispatch(
        petApi.endpoints.removePetFromFavorites.initiate(operation.petId, {
          fixedCacheKey: idempotencyKey,
        })
      ).unwrap();
    }
  }

  /**
   * Check if operation should be retried based on retry config and backoff
   */
  private shouldRetryOperation(operation: QueuedFavoriteOperation): boolean {
    if (operation.retryCount >= AdoptionService.RETRY_CONFIG.maxRetries) {
      return false;
    }

    if (!operation.lastRetryAt) {
      return true; // First retry
    }

    const backoffDelay = Math.min(
      AdoptionService.RETRY_CONFIG.baseDelayMs * 
      Math.pow(AdoptionService.RETRY_CONFIG.backoffMultiplier, operation.retryCount),
      AdoptionService.RETRY_CONFIG.maxDelayMs
    );

    return Date.now() - operation.lastRetryAt >= backoffDelay;
  }

  /**
   * Remove operation from queue by ID
   */
  private removeOperationFromQueue(operationId: string): void {
    this.favoriteQueue = this.favoriteQueue.filter(op => op.id !== operationId);
  }

  /**
   * Legacy sync method for backwards compatibility
   */
  async syncPendingOperations(): Promise<void> {
    return this.processPendingOperationsWithRetry();
  }

  /**
   * Handle network state changes (legacy method, now handled by network monitoring)
   */
  handleNetworkStateChange(isOnline: boolean): void {
    // This method is kept for backwards compatibility
    // Network state changes are now handled by setupNetworkMonitoring()
    loggingService.debug('AdoptionService: Legacy network state change handler called', {
      isOnline,
      note: 'Network monitoring is now handled automatically',
    });
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

  private async queueFavoriteOperation(
    operation: 'add' | 'remove',
    petId: string,
    correlationId: string,
    notes?: string
  ): Promise<void> {
    // Generate unique ID for the operation
    const operationId = `${operation}_${petId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Remove any existing operation for the same pet to avoid conflicts
    this.favoriteQueue = this.favoriteQueue.filter(op => op.petId !== petId);
    
    // Add new operation with enhanced tracking
    const queuedOperation: QueuedFavoriteOperation = {
      id: operationId,
      operation,
      petId,
      correlationId,
      timestamp: Date.now(),
      retryCount: 0,
      notes,
    };
    
    this.favoriteQueue.push(queuedOperation);
    
    // Save to persistent storage
    await this.saveQueueToStorage();
    
    loggingService.debug('AdoptionService: Queued operation with persistent storage', {
      operationId,
      operation,
      petId,
      queueSize: this.favoriteQueue.length,
    });
  }

  /**
   * Get queue status and statistics
   */
  getQueueStatus() {
    const now = Date.now();
    const pending = this.favoriteQueue.filter(op => op.retryCount < AdoptionService.RETRY_CONFIG.maxRetries);
    const failed = this.favoriteQueue.filter(op => op.retryCount >= AdoptionService.RETRY_CONFIG.maxRetries);
    
    return {
      totalOperations: this.favoriteQueue.length,
      pendingOperations: pending.length,
      failedOperations: failed.length,
      isProcessing: this.isProcessingQueue,
      oldestOperation: this.favoriteQueue.length > 0 
        ? Math.min(...this.favoriteQueue.map(op => op.timestamp))
        : null,
      operationsByType: {
        add: this.favoriteQueue.filter(op => op.operation === 'add').length,
        remove: this.favoriteQueue.filter(op => op.operation === 'remove').length,
      },
    };
  }

  /**
   * Clear expired and failed operations from queue
   */
  async clearExpiredOperations(): Promise<void> {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    const initialCount = this.favoriteQueue.length;
    
    this.favoriteQueue = this.favoriteQueue.filter(op => {
      const isNotExpired = now - op.timestamp < maxAge;
      const hasRetriesLeft = op.retryCount < AdoptionService.RETRY_CONFIG.maxRetries;
      return isNotExpired && hasRetriesLeft;
    });
    
    if (this.favoriteQueue.length !== initialCount) {
      await this.saveQueueToStorage();
      loggingService.info('AdoptionService: Cleared expired operations', {
        removed: initialCount - this.favoriteQueue.length,
        remaining: this.favoriteQueue.length,
      });
    }
  }

  /**
   * Force immediate processing of queue (for testing/manual sync)
   */
  async forceSync(): Promise<void> {
    if (!this.isProcessingQueue) {
      await this.processPendingOperationsWithRetry();
    }
  }

  /**
   * Cleanup method for service shutdown
   */
  destroy(): void {
    this.stopPeriodicSync();
    
    // Unsubscribe from network monitoring
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    
    this.isInitialized = false;
    this.isProcessingQueue = false;
    
    loggingService.info('AdoptionService: Service destroyed', {
      pendingOperations: this.favoriteQueue.length,
      networkMonitoringDisabled: true,
    });
  }

  /**
   * Get comprehensive adoption and sync statistics
   */
  getAdoptionStatistics() {
    const state = store.getState();
    const petState = state.pets;
    const networkInfo = networkService.getNetworkInfo();
    const queueStatus = this.getQueueStatus();
    
    return {
      // Core adoption stats
      favoritesCount: petState.favorites.length,
      applicationsCount: petState.applications.length,
      draftsCount: Object.keys(petState.drafts).length,
      pendingOperations: petState.pendingFavoriteOperations.length,
      
      // Adoption funnel stats
      adoptionFunnelStats: {
        viewedPets: petState.adoptionFunnel.viewedPets.length,
        favoritedPets: petState.adoptionFunnel.favoritedPets.length,
        startedApplications: petState.adoptionFunnel.startedApplications.length,
        submittedApplications: petState.adoptionFunnel.submittedApplications.length,
      },
      
      // Network and sync stats
      networkStats: {
        isConnected: networkInfo.isConnected,
        connectionType: networkInfo.connectionType,
        isInternetReachable: networkInfo.isInternetReachable,
        connectionQuality: networkService.getConnectionQuality(),
        isProcessingQueue: this.isProcessingQueue,
      },
      
      // Queue statistics
      queueStats: queueStatus,
      
      // Service health
      serviceHealth: {
        isInitialized: this.isInitialized,
        hasNetworkMonitoring: this.networkUnsubscribe !== null,
        hasSyncTimer: this.syncTimer !== null,
      },
    };
  }

  /**
   * Get network-aware sync recommendations
   */
  getSyncRecommendations() {
    const networkInfo = networkService.getNetworkInfo();
    const queueStatus = this.getQueueStatus();
    const connectionQuality = networkService.getConnectionQuality();
    
    const recommendations = [];
    
    if (!networkInfo.isConnected) {
      recommendations.push({
        type: 'warning',
        message: 'Device is offline. Operations will sync when connection is restored.',
        action: null,
      });
    } else if (!networkInfo.isInternetReachable) {
      recommendations.push({
        type: 'warning',
        message: 'Internet not reachable. Check your connection.',
        action: 'retry_connection',
      });
    } else if (connectionQuality === 'poor') {
      recommendations.push({
        type: 'info',
        message: 'Connection quality is poor. Sync may be slower than usual.',
        action: null,
      });
    }
    
    if (queueStatus.pendingOperations > 10) {
      recommendations.push({
        type: 'warning',
        message: `${queueStatus.pendingOperations} operations pending sync.`,
        action: 'force_sync',
      });
    }
    
    if (queueStatus.failedOperations > 0) {
      recommendations.push({
        type: 'error',
        message: `${queueStatus.failedOperations} operations failed after max retries.`,
        action: 'clear_failed',
      });
    }
    
    if (queueStatus.oldestOperation && Date.now() - queueStatus.oldestOperation > 24 * 60 * 60 * 1000) {
      recommendations.push({
        type: 'warning',
        message: 'Some operations have been pending for over 24 hours.',
        action: 'clear_expired',
      });
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const adoptionService = new AdoptionService();
export default adoptionService;