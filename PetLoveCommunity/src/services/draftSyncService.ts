// Pet Love Community - Draft Sync Service
// Advanced draft management with auto-sync, conflict resolution, and version control

import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import { petApi } from './petApi';
import correlationIdService from './correlationIdService';
import { idempotencyService } from './idempotencyService';
import { loggingService } from './loggingService';
import deviceInfoService from './deviceInfoService';
import networkService from './networkService';
import { AdoptionDraft } from '../features/pets/petSlice';
import { updateApplicationDraft } from '../features/pets/petSlice';
import type { AdoptionApplication } from '../types/pet';

// Storage keys
const DRAFTS_STORAGE_KEY = '@PetLoveCommunity:ApplicationDrafts';
const SYNC_QUEUE_KEY = '@PetLoveCommunity:DraftSyncQueue';
const SYNC_METADATA_KEY = '@PetLoveCommunity:DraftSyncMetadata';

export interface DraftSyncOptions {
  forceSync?: boolean;
  resolveConflicts?: boolean;
  createBackup?: boolean;
}

export interface DraftSyncResult {
  success: boolean;
  draftId: string;
  version?: number;
  conflictsResolved?: number;
  error?: string;
  correlationId: string;
}

export interface DraftConflictResolution {
  strategy: 'server' | 'local' | 'merge' | 'manual';
  resolvedData?: Partial<AdoptionApplication>;
  backupCreated?: boolean;
}

interface SyncQueueItem {
  draftId: string;
  version: number;
  operation: 'create' | 'update' | 'delete';
  formData: Partial<AdoptionApplication>;
  priority: 'high' | 'normal' | 'low';
  createdAt: string;
  retryCount: number;
  lastAttempt?: string;
}

interface SyncMetadata {
  lastFullSync: string;
  lastIncrementalSync: string;
  totalSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  averageSyncDuration: number;
}

class DraftSyncService {
  private static readonly MAX_RETRIES = 3;
  private static readonly SYNC_INTERVAL = 30000; // 30 seconds
  private static readonly BACKUP_VERSIONS = 5;
  private static readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;
  private networkUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the draft sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadSyncQueue();
      await this.startAutoSync();
      this.setupNetworkMonitoring();
      
      this.isInitialized = true;
      
      loggingService.info('DraftSyncService: Initialized', {
        queueSize: this.syncQueue.length,
        networkConnected: networkService.getIsConnected(),
      });
    } catch (error) {
      loggingService.error('DraftSyncService: Failed to initialize', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create or update a draft with auto-sync
   */
  async saveDraft(
    draftId: string,
    formData: Partial<AdoptionApplication>,
    options: { step?: number; immediate?: boolean } = {}
  ): Promise<DraftSyncResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    const deviceId = await deviceInfoService.getDeviceId();

    try {
      const existingDrafts = await this.loadDraftsFromStorage();
      const existingDraft = existingDrafts[draftId];
      
      const now = new Date().toISOString();
      const version = (existingDraft?.version || 0) + 1;

      // Create updated draft
      const updatedDraft: AdoptionDraft = {
        ...existingDraft,
        id: draftId,
        formData,
        version,
        lastModified: now,
        lastSaved: now,
        currentStep: options.step || existingDraft?.currentStep || 1,
        completionPercentage: this.calculateCompletionPercentage(formData),
        isAutoSaved: !options.immediate,
        syncStatus: 'local',
        metadata: {
          deviceId,
          appVersion: '1.0.0', // TODO: Get from app config
          correlationId,
          changesSinceLastSync: this.getChangedFields(existingDraft?.formData, formData),
          autoSaveInterval: DraftSyncService.AUTO_SAVE_INTERVAL,
        },
        backupVersions: this.createBackupVersions(existingDraft, formData),
        ...(existingDraft ? {} : {
          createdAt: now,
          petId: formData.petId || '',
          petName: 'Unknown Pet', // TODO: Get from pet data
        }),
      };

      // Update Redux store
      store.dispatch(updateApplicationDraft({
        draftId,
        formData,
        step: options.step,
        isAutoSaved: !options.immediate,
      }));

      // Save to local storage
      existingDrafts[draftId] = updatedDraft;
      await this.saveDraftsToStorage(existingDrafts);

      // Queue for sync if online
      if (networkService.getIsConnected()) {
        await this.queueForSync(updatedDraft, options.immediate ? 'high' : 'normal');
        
        if (options.immediate) {
          await this.processSyncQueue();
        }
      }

      // Schedule auto-save for this draft
      this.scheduleAutoSave(draftId);

      loggingService.info('DraftSyncService: Draft saved', {
        correlationId,
        draftId,
        version,
        immediate: options.immediate,
        changedFields: updatedDraft.metadata.changesSinceLastSync.length,
      });

      return {
        success: true,
        draftId,
        version,
        correlationId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
      
      loggingService.error('DraftSyncService: Failed to save draft', {
        correlationId,
        draftId,
        error: errorMessage,
      });

      return {
        success: false,
        draftId,
        error: errorMessage,
        correlationId,
      };
    }
  }

  /**
   * Get draft with auto-recovery
   */
  async getDraft(draftId: string): Promise<AdoptionDraft | null> {
    try {
      const drafts = await this.loadDraftsFromStorage();
      const draft = drafts[draftId];

      if (!draft) return null;

      // Check if draft needs recovery
      if (draft.syncStatus === 'error' && draft.backupVersions.length > 0) {
        loggingService.warn('DraftSyncService: Attempting draft recovery', {
          draftId,
          backupVersions: draft.backupVersions.length,
        });

        // Try to recover from the most recent backup
        const latestBackup = draft.backupVersions[draft.backupVersions.length - 1];
        draft.formData = latestBackup.formData;
        draft.version = latestBackup.version;
        draft.syncStatus = 'local';
        
        await this.saveDraftsToStorage({ ...drafts, [draftId]: draft });
      }

      return draft;
    } catch (error) {
      loggingService.error('DraftSyncService: Failed to get draft', {
        draftId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Sync draft with server
   */
  async syncDraft(
    draftId: string,
    options: DraftSyncOptions = {}
  ): Promise<DraftSyncResult> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      const draft = await this.getDraft(draftId);
      if (!draft) {
        return {
          success: false,
          draftId,
          error: 'Draft not found',
          correlationId,
        };
      }

      // Mark as syncing
      await this.updateDraftSyncStatus(draftId, 'syncing');

      const idempotencyKey = await idempotencyService.generateKey('draft_sync', {
        draftId,
        version: draft.version,
      });

      // Sync with server
      const result = await store.dispatch(
        petApi.endpoints.syncApplicationDraft.initiate({
          draftId,
          version: draft.version,
          formData: draft.formData,
          lastModified: draft.lastModified,
          serverVersion: draft.serverVersion,
        }, {
          fixedCacheKey: idempotencyKey,
        })
      ).unwrap();

      if (result.success) {
        if (result.data.hasConflict && result.data.serverData) {
          // Handle conflict
          const resolution = await this.resolveConflict(draft, result.data.serverData, options);
          
          if (resolution.strategy === 'manual') {
            await this.updateDraftSyncStatus(draftId, 'conflict');
            draft.conflictData = result.data.serverData;
          } else {
            await this.applyConflictResolution(draft, resolution);
            await this.updateDraftSyncStatus(draftId, 'synced');
          }
        } else {
          // Successful sync without conflicts
          draft.serverVersion = result.data.version;
          draft.syncStatus = 'synced';
          draft.metadata.changesSinceLastSync = [];
          
          await this.saveDraftsToStorage({ [draftId]: draft });
        }

        return {
          success: true,
          draftId,
          version: draft.version,
          conflictsResolved: result.data.hasConflict ? 1 : 0,
          correlationId,
        };
      } else {
        await this.updateDraftSyncStatus(draftId, 'error');
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      await this.updateDraftSyncStatus(draftId, 'error');
      
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      
      loggingService.error('DraftSyncService: Failed to sync draft', {
        correlationId,
        draftId,
        error: errorMessage,
      });

      return {
        success: false,
        draftId,
        error: errorMessage,
        correlationId,
      };
    }
  }

  /**
   * Resolve conflict between local and server data
   */
  private async resolveConflict(
    localDraft: AdoptionDraft,
    serverData: Partial<AdoptionApplication>,
    options: DraftSyncOptions
  ): Promise<DraftConflictResolution> {
    const correlationId = await correlationIdService.getCorrelationId();

    loggingService.info('DraftSyncService: Resolving conflict', {
      correlationId,
      draftId: localDraft.id,
      localVersion: localDraft.version,
      strategy: options.resolveConflicts ? 'auto' : 'manual',
    });

    if (!options.resolveConflicts) {
      return { strategy: 'manual' };
    }

    // Simple conflict resolution strategy
    const localModified = new Date(localDraft.lastModified).getTime();
    const serverModified = new Date(serverData.updatedAt || '').getTime();

    if (serverModified > localModified) {
      // Server is newer, use server data
      return {
        strategy: 'server',
        resolvedData: serverData,
        backupCreated: true,
      };
    } else {
      // Local is newer, keep local data
      return {
        strategy: 'local',
        resolvedData: localDraft.formData,
        backupCreated: false,
      };
    }
  }

  /**
   * Apply conflict resolution
   */
  private async applyConflictResolution(
    draft: AdoptionDraft,
    resolution: DraftConflictResolution
  ): Promise<void> {
    if (resolution.resolvedData) {
      // Create backup before applying resolution
      if (resolution.backupCreated) {
        const backup = {
          version: draft.version,
          formData: { ...draft.formData },
          savedAt: draft.lastModified,
          completionPercentage: draft.completionPercentage,
        };

        draft.backupVersions.push(backup);
        draft.backupVersions = draft.backupVersions.slice(-DraftSyncService.BACKUP_VERSIONS);
      }

      draft.formData = resolution.resolvedData;
      draft.completionPercentage = this.calculateCompletionPercentage(resolution.resolvedData);
      draft.lastModified = new Date().toISOString();
      draft.version++;
    }
  }

  /**
   * Schedule auto-save for a draft
   */
  private scheduleAutoSave(draftId: string): void {
    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(draftId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new auto-save
    const timer = setTimeout(async () => {
      const draft = await this.getDraft(draftId);
      if (draft && draft.syncStatus === 'local') {
        await this.queueForSync(draft, 'low');
      }
    }, DraftSyncService.AUTO_SAVE_INTERVAL);

    this.autoSaveTimers.set(draftId, timer);
  }

  /**
   * Queue draft for sync
   */
  private async queueForSync(
    draft: AdoptionDraft,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      draftId: draft.id,
      version: draft.version,
      operation: 'update',
      formData: draft.formData,
      priority,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Remove existing item for same draft
    this.syncQueue = this.syncQueue.filter(item => item.draftId !== draft.id);
    this.syncQueue.push(queueItem);

    // Sort by priority
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    await this.saveSyncQueue();
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;
    if (!networkService.getIsConnected()) return;

    this.isSyncing = true;
    const correlationId = await correlationIdService.getCorrelationId();

    loggingService.info('DraftSyncService: Processing sync queue', {
      correlationId,
      queueSize: this.syncQueue.length,
    });

    const itemsToProcess = [...this.syncQueue];
    
    for (const item of itemsToProcess) {
      try {
        const result = await this.syncDraft(item.draftId, { forceSync: true });
        
        if (result.success) {
          // Remove from queue
          this.syncQueue = this.syncQueue.filter(q => 
            !(q.draftId === item.draftId && q.version === item.version)
          );
        } else {
          // Increment retry count
          item.retryCount++;
          item.lastAttempt = new Date().toISOString();
          
          if (item.retryCount >= DraftSyncService.MAX_RETRIES) {
            // Remove failed item
            this.syncQueue = this.syncQueue.filter(q => 
              !(q.draftId === item.draftId && q.version === item.version)
            );
            
            loggingService.error('DraftSyncService: Sync failed after max retries', {
              correlationId,
              draftId: item.draftId,
              retries: item.retryCount,
            });
          }
        }
      } catch (error) {
        loggingService.error('DraftSyncService: Sync queue processing error', {
          correlationId,
          draftId: item.draftId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.saveSyncQueue();
    this.isSyncing = false;
  }

  /**
   * Start automatic sync timer
   */
  private async startAutoSync(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (networkService.getIsConnected()) {
        await this.processSyncQueue();
      }
    }, DraftSyncService.SYNC_INTERVAL);
  }

  /**
   * Setup network monitoring for sync triggers
   */
  private setupNetworkMonitoring(): void {
    this.networkUnsubscribe = networkService.addNetworkChangeListener(
      async (networkInfo, previousState) => {
        // Trigger sync when connection is restored
        if (!previousState.isConnected && networkInfo.isConnected && networkInfo.isInternetReachable) {
          loggingService.info('DraftSyncService: Connection restored, triggering sync', {
            queueSize: this.syncQueue.length,
          });

          // Wait for connection to stabilize
          setTimeout(() => {
            this.processSyncQueue();
          }, 2000);
        }
      }
    );
  }

  /**
   * Helper methods for data management
   */
  private calculateCompletionPercentage(formData: Partial<AdoptionApplication>): number {
    const requiredFields = [
      'personalInfo.firstName',
      'personalInfo.lastName', 
      'personalInfo.email',
      'personalInfo.phone',
      'livingSituation.housingType',
      'livingSituation.ownOrRent',
      'experience.previousPets',
    ];

    const completedFields = requiredFields.filter(fieldPath => {
      const value = this.getNestedValue(formData, fieldPath);
      return value !== undefined && value !== null && value !== '';
    });

    return Math.round((completedFields.length / requiredFields.length) * 100);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getChangedFields(
    oldData: Partial<AdoptionApplication> | undefined,
    newData: Partial<AdoptionApplication>
  ): string[] {
    if (!oldData) return ['initial_create'];

    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (JSON.stringify(oldData[key as keyof AdoptionApplication]) !== 
          JSON.stringify(newData[key as keyof AdoptionApplication])) {
        changes.push(key);
      }
    }

    return changes;
  }

  private createBackupVersions(
    existingDraft: AdoptionDraft | undefined,
    newFormData: Partial<AdoptionApplication>
  ): AdoptionDraft['backupVersions'] {
    const backups = existingDraft?.backupVersions || [];

    if (existingDraft?.formData) {
      const backup = {
        version: existingDraft.version,
        formData: { ...existingDraft.formData },
        savedAt: existingDraft.lastModified,
        completionPercentage: existingDraft.completionPercentage,
      };

      backups.push(backup);
    }

    // Keep only the most recent backups
    return backups.slice(-DraftSyncService.BACKUP_VERSIONS);
  }

  private async updateDraftSyncStatus(draftId: string, status: AdoptionDraft['syncStatus']): Promise<void> {
    const drafts = await this.loadDraftsFromStorage();
    if (drafts[draftId]) {
      drafts[draftId].syncStatus = status;
      await this.saveDraftsToStorage(drafts);
    }
  }

  /**
   * Storage management
   */
  private async loadDraftsFromStorage(): Promise<Record<string, AdoptionDraft>> {
    try {
      const stored = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      loggingService.warn('DraftSyncService: Failed to load drafts from storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  private async saveDraftsToStorage(drafts: Record<string, AdoptionDraft>): Promise<void> {
    try {
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      loggingService.warn('DraftSyncService: Failed to save drafts to storage', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      this.syncQueue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      loggingService.warn('DraftSyncService: Failed to load sync queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      loggingService.warn('DraftSyncService: Failed to save sync queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Public API methods
   */
  public getDraftSyncStatus(draftId: string): {
    status: AdoptionDraft['syncStatus'];
    queuePosition?: number;
    lastSync?: string;
    pendingChanges: number;
  } {
    const queueItem = this.syncQueue.find(item => item.draftId === draftId);
    const queuePosition = queueItem ? this.syncQueue.indexOf(queueItem) + 1 : undefined;

    return {
      status: 'local', // Would get from stored draft
      queuePosition,
      pendingChanges: queueItem?.retryCount || 0,
    };
  }

  public async forceSync(draftId?: string): Promise<void> {
    if (draftId) {
      await this.syncDraft(draftId, { forceSync: true });
    } else {
      await this.processSyncQueue();
    }
  }

  public getServiceStatistics() {
    return {
      syncQueueSize: this.syncQueue.length,
      isSyncing: this.isSyncing,
      autoSaveTimers: this.autoSaveTimers.size,
      isInitialized: this.isInitialized,
      networkConnected: networkService.getIsConnected(),
    };
  }

  /**
   * Cleanup service resources
   */
  public destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.autoSaveTimers.forEach(timer => clearTimeout(timer));
    this.autoSaveTimers.clear();

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.isInitialized = false;
    
    loggingService.info('DraftSyncService: Service destroyed', {
      pendingSyncs: this.syncQueue.length,
    });
  }
}

// Export singleton instance
export const draftSyncService = new DraftSyncService();
export default draftSyncService;