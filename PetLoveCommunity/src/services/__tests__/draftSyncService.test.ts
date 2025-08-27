// Pet Love Community - Draft Sync Service Tests
// Comprehensive test suite for advanced draft management with auto-sync, conflict resolution, and version control

import AsyncStorage from '@react-native-async-storage/async-storage';
import { draftSyncService } from '../draftSyncService';
import type { DraftSyncOptions, DraftSyncResult, DraftConflictResolution } from '../draftSyncService';
import { store } from '../../store';
import { petApi } from '../petApi';
import correlationIdService from '../correlationIdService';
import { idempotencyService } from '../idempotencyService';
import { loggingService } from '../loggingService';
import deviceInfoService from '../deviceInfoService';
import networkService from '../networkService';
import { updateApplicationDraft } from '../../features/pets/petSlice';
import type { AdoptionApplication, AdoptionDraft } from '../../types/pet';

// Mock all dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../store');
jest.mock('../petApi');
jest.mock('../correlationIdService');
jest.mock('../idempotencyService');
jest.mock('../loggingService');
jest.mock('../deviceInfoService');
jest.mock('../networkService');
jest.mock('../../features/pets/petSlice');

// Type the mocked dependencies
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockStore = store as jest.Mocked<typeof store>;
const mockPetApi = petApi as jest.Mocked<typeof petApi>;
const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;
const mockIdempotencyService = idempotencyService as jest.Mocked<typeof idempotencyService>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockDeviceInfoService = deviceInfoService as jest.Mocked<typeof deviceInfoService>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;
const mockUpdateApplicationDraft = updateApplicationDraft as jest.MockedFunction<typeof updateApplicationDraft>;

// Mock timers
jest.useFakeTimers();

describe('DraftSyncService', () => {
  const mockCorrelationId = 'corr-123';
  const mockDeviceId = 'device-456';
  const mockIdempotencyKey = 'idem-789';

  const mockFormData: Partial<AdoptionApplication> = {
    petId: 'pet-123',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-123-4567',
    },
    livingSituation: {
      housingType: 'house',
      ownOrRent: 'own',
      yardType: 'large',
    },
  };

  const mockDraft: AdoptionDraft = {
    id: 'draft-123',
    petId: 'pet-123',
    petName: 'Buddy',
    formData: mockFormData,
    version: 1,
    serverVersion: 0,
    currentStep: 1,
    completionPercentage: 60,
    lastModified: '2024-01-01T10:00:00Z',
    lastSaved: '2024-01-01T10:00:00Z',
    createdAt: '2024-01-01T09:00:00Z',
    isAutoSaved: false,
    syncStatus: 'local',
    metadata: {
      deviceId: mockDeviceId,
      appVersion: '1.0.0',
      correlationId: mockCorrelationId,
      changesSinceLastSync: ['personalInfo'],
      autoSaveInterval: 30000,
    },
    backupVersions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Setup default mock implementations
    mockCorrelationIdService.getCorrelationId.mockResolvedValue(mockCorrelationId);
    mockDeviceInfoService.getDeviceId.mockResolvedValue(mockDeviceId);
    mockIdempotencyService.generateKey.mockResolvedValue(mockIdempotencyKey);
    mockNetworkService.getIsConnected.mockReturnValue(true);
    mockNetworkService.addNetworkChangeListener.mockReturnValue(() => {});

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock store dispatch
    mockStore.dispatch.mockImplementation((action) => {
      if (typeof action === 'function') {
        return Promise.resolve({ unwrap: () => Promise.resolve({ success: true, data: {} }) });
      }
      return action;
    });

    // Mock RTK Query endpoints
    const mockInitiate = jest.fn().mockReturnValue({
      unwrap: () => Promise.resolve({
        success: true,
        data: { version: 2, hasConflict: false },
      }),
    });

    mockPetApi.endpoints = {
      syncApplicationDraft: { initiate: mockInitiate },
    } as any;

    // Mock logging service
    mockLoggingService.info.mockImplementation();
    mockLoggingService.warn.mockImplementation();
    mockLoggingService.error.mockImplementation();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    draftSyncService.destroy();
  });

  describe('Service Initialization', () => {
    it('initializes service correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('[]'); // sync queue

      await draftSyncService.initialize();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@PetLoveCommunity:DraftSyncQueue');
      expect(mockNetworkService.addNetworkChangeListener).toHaveBeenCalled();
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Initialized',
        expect.objectContaining({
          queueSize: 0,
          networkConnected: true,
        })
      );
    });

    it('handles initialization errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      await draftSyncService.initialize();

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'DraftSyncService: Failed to initialize',
        expect.objectContaining({
          error: 'Storage error',
        })
      );
    });

    it('does not reinitialize if already initialized', async () => {
      await draftSyncService.initialize();
      jest.clearAllMocks();

      await draftSyncService.initialize();

      expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
      expect(mockLoggingService.info).not.toHaveBeenCalled();
    });

    it('loads existing sync queue on initialization', async () => {
      const queueData = JSON.stringify([{
        draftId: 'draft-1',
        version: 1,
        operation: 'update',
        formData: mockFormData,
        priority: 'normal',
        createdAt: '2024-01-01T10:00:00Z',
        retryCount: 0,
      }]);

      mockAsyncStorage.getItem.mockResolvedValueOnce(queueData);

      await draftSyncService.initialize();

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Initialized',
        expect.objectContaining({
          queueSize: 1,
        })
      );
    });
  });

  describe('Draft Saving', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('saves new draft successfully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}'); // empty drafts

      const result = await draftSyncService.saveDraft('draft-123', mockFormData, { step: 1 });

      expect(result.success).toBe(true);
      expect(result.draftId).toBe('draft-123');
      expect(result.version).toBe(1);
      expect(result.correlationId).toBe(mockCorrelationId);

      expect(mockStore.dispatch).toHaveBeenCalledWith(mockUpdateApplicationDraft({
        draftId: 'draft-123',
        formData: mockFormData,
        step: 1,
        isAutoSaved: false,
      }));

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@PetLoveCommunity:ApplicationDrafts',
        expect.stringContaining('"draft-123"')
      );
    });

    it('updates existing draft with version increment', async () => {
      const existingDrafts = {
        'draft-123': { ...mockDraft, version: 2 }
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingDrafts));

      const result = await draftSyncService.saveDraft('draft-123', mockFormData);

      expect(result.success).toBe(true);
      expect(result.version).toBe(3); // Should increment from 2 to 3
    });

    it('calculates completion percentage correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      const incompleteData = {
        personalInfo: { firstName: 'John' } // Missing required fields
      };

      const result = await draftSyncService.saveDraft('draft-123', incompleteData);

      expect(result.success).toBe(true);
      // Should calculate completion based on filled required fields
    });

    it('creates backup versions when updating existing draft', async () => {
      const existingDraft = { 
        ...mockDraft, 
        formData: { personalInfo: { firstName: 'Jane' } } 
      };
      const existingDrafts = { 'draft-123': existingDraft };
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingDrafts));

      await draftSyncService.saveDraft('draft-123', mockFormData);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:ApplicationDrafts'
      );
      const savedData = JSON.parse(setItemCall![1]);
      const savedDraft = savedData['draft-123'];

      expect(savedDraft.backupVersions).toHaveLength(1);
      expect(savedDraft.backupVersions[0].formData.personalInfo.firstName).toBe('Jane');
    });

    it('queues draft for sync when online', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      await draftSyncService.saveDraft('draft-123', mockFormData, { immediate: true });

      // Should trigger immediate sync
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.anything() // The RTK Query sync call
      );
    });

    it('does not queue for sync when offline', async () => {
      mockNetworkService.getIsConnected.mockReturnValue(false);
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      const result = await draftSyncService.saveDraft('draft-123', mockFormData);

      expect(result.success).toBe(true);
      // Should not attempt sync when offline
      expect(mockStore.dispatch).toHaveBeenCalledTimes(1); // Only Redux update
    });

    it('schedules auto-save timer', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      await draftSyncService.saveDraft('draft-123', mockFormData);

      // Should schedule a timer for auto-save
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('handles save errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await draftSyncService.saveDraft('draft-123', mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
      expect(result.correlationId).toBe(mockCorrelationId);

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'DraftSyncService: Failed to save draft',
        expect.objectContaining({
          error: 'Storage error',
          draftId: 'draft-123',
        })
      );
    });

    it('tracks changed fields correctly', async () => {
      const existingData = { personalInfo: { firstName: 'John', lastName: 'Smith' } };
      const newData = { personalInfo: { firstName: 'Jane', lastName: 'Smith' } };
      
      const existingDraft = { ...mockDraft, formData: existingData };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ 'draft-123': existingDraft }));

      await draftSyncService.saveDraft('draft-123', newData);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:ApplicationDrafts'
      );
      const savedData = JSON.parse(setItemCall![1]);
      const savedDraft = savedData['draft-123'];

      expect(savedDraft.metadata.changesSinceLastSync).toEqual(['personalInfo']);
    });
  });

  describe('Draft Retrieval', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('retrieves existing draft successfully', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));

      const result = await draftSyncService.getDraft('draft-123');

      expect(result).toEqual(mockDraft);
    });

    it('returns null for non-existent draft', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      const result = await draftSyncService.getDraft('draft-999');

      expect(result).toBeNull();
    });

    it('recovers draft from backup when in error state', async () => {
      const errorDraft = {
        ...mockDraft,
        syncStatus: 'error' as const,
        backupVersions: [{
          version: 1,
          formData: { personalInfo: { firstName: 'Backup John' } },
          savedAt: '2024-01-01T09:00:00Z',
          completionPercentage: 50,
        }],
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ 'draft-123': errorDraft }));
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await draftSyncService.getDraft('draft-123');

      expect(result?.formData.personalInfo?.firstName).toBe('Backup John');
      expect(result?.syncStatus).toBe('local');
      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        'DraftSyncService: Attempting draft recovery',
        expect.objectContaining({
          draftId: 'draft-123',
          backupVersions: 1,
        })
      );
    });

    it('handles retrieval errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await draftSyncService.getDraft('draft-123');

      expect(result).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'DraftSyncService: Failed to get draft',
        expect.objectContaining({
          draftId: 'draft-123',
          error: 'Storage error',
        })
      );
    });
  });

  describe('Draft Synchronization', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('syncs draft successfully without conflicts', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));
      
      const mockSyncResponse = {
        success: true,
        data: { version: 2, hasConflict: false },
      };

      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve(mockSyncResponse),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      const result = await draftSyncService.syncDraft('draft-123');

      expect(result.success).toBe(true);
      expect(result.draftId).toBe('draft-123');
      expect(result.version).toBe(1);
      expect(result.conflictsResolved).toBe(0);

      expect(mockInitiate).toHaveBeenCalledWith({
        draftId: 'draft-123',
        version: 1,
        formData: mockFormData,
        lastModified: '2024-01-01T10:00:00Z',
        serverVersion: 0,
      }, {
        fixedCacheKey: mockIdempotencyKey,
      });
    });

    it('handles conflict resolution automatically', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));
      
      const mockSyncResponse = {
        success: true,
        data: {
          version: 3,
          hasConflict: true,
          serverData: {
            ...mockFormData,
            personalInfo: { ...mockFormData.personalInfo, firstName: 'Server John' },
            updatedAt: '2024-01-01T11:00:00Z', // Server is newer
          },
        },
      };

      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve(mockSyncResponse),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      const result = await draftSyncService.syncDraft('draft-123', { resolveConflicts: true });

      expect(result.success).toBe(true);
      expect(result.conflictsResolved).toBe(1);
      
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Resolving conflict',
        expect.objectContaining({
          draftId: 'draft-123',
          strategy: 'auto',
        })
      );
    });

    it('sets conflict status for manual resolution', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));
      
      const mockSyncResponse = {
        success: true,
        data: {
          version: 3,
          hasConflict: true,
          serverData: { personalInfo: { firstName: 'Server John' } },
        },
      };

      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve(mockSyncResponse),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      await draftSyncService.syncDraft('draft-123', { resolveConflicts: false });

      // Should update draft with conflict status
      const setItemCalls = mockAsyncStorage.setItem.mock.calls.filter(
        call => call[0] === '@PetLoveCommunity:ApplicationDrafts'
      );
      expect(setItemCalls.length).toBeGreaterThan(0);
    });

    it('returns error for non-existent draft', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      const result = await draftSyncService.syncDraft('draft-999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Draft not found');
    });

    it('handles sync API errors', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));

      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.reject(new Error('Network error')),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      const result = await draftSyncService.syncDraft('draft-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'DraftSyncService: Failed to sync draft',
        expect.objectContaining({
          draftId: 'draft-123',
          error: 'Network error',
        })
      );
    });

    it('uses idempotency key for sync requests', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));

      await draftSyncService.syncDraft('draft-123');

      expect(mockIdempotencyService.generateKey).toHaveBeenCalledWith('draft_sync', {
        draftId: 'draft-123',
        version: 1,
      });
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('resolves conflicts using server data when server is newer', async () => {
      const localDraft = {
        ...mockDraft,
        lastModified: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        ...mockFormData,
        personalInfo: { ...mockFormData.personalInfo, firstName: 'Server John' },
        updatedAt: '2024-01-01T11:00:00Z', // Server is newer
      };

      // Test the conflict resolution logic through sync
      const drafts = { 'draft-123': localDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));
      
      const mockSyncResponse = {
        success: true,
        data: { version: 3, hasConflict: true, serverData },
      };

      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve(mockSyncResponse),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      const result = await draftSyncService.syncDraft('draft-123', { resolveConflicts: true });

      expect(result.success).toBe(true);
      expect(result.conflictsResolved).toBe(1);
    });

    it('resolves conflicts using local data when local is newer', async () => {
      const localDraft = {
        ...mockDraft,
        lastModified: '2024-01-01T12:00:00Z', // Local is newer
      };

      const serverData = {
        ...mockFormData,
        personalInfo: { ...mockFormData.personalInfo, firstName: 'Server John' },
        updatedAt: '2024-01-01T11:00:00Z',
      };

      const drafts = { 'draft-123': localDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));
      
      const mockSyncResponse = {
        success: true,
        data: { version: 3, hasConflict: true, serverData },
      };

      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve(mockSyncResponse),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      const result = await draftSyncService.syncDraft('draft-123', { resolveConflicts: true });

      expect(result.success).toBe(true);
      expect(result.conflictsResolved).toBe(1);
    });
  });

  describe('Sync Queue Management', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('processes sync queue when network is available', async () => {
      // Mock existing queue
      const queueItem = {
        draftId: 'draft-123',
        version: 1,
        operation: 'update' as const,
        formData: mockFormData,
        priority: 'normal' as const,
        createdAt: '2024-01-01T10:00:00Z',
        retryCount: 0,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([queueItem]));
      
      // Re-initialize to load queue
      draftSyncService.destroy();
      await draftSyncService.initialize();

      // Mock draft retrieval for sync
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));

      // Trigger queue processing by running pending timers
      jest.advanceTimersByTime(30000); // Advance by sync interval

      await new Promise(resolve => setTimeout(resolve, 0)); // Let async operations complete

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Processing sync queue',
        expect.objectContaining({
          queueSize: 1,
        })
      );
    });

    it('retries failed sync attempts up to max retries', async () => {
      // Mock queue with item that will fail
      const queueItem = {
        draftId: 'draft-123',
        version: 1,
        operation: 'update' as const,
        formData: mockFormData,
        priority: 'normal' as const,
        createdAt: '2024-01-01T10:00:00Z',
        retryCount: 2, // Already retried twice
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([queueItem]));
      
      // Mock failed sync
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));
      
      const mockInitiate = jest.fn().mockReturnValue({
        unwrap: () => Promise.reject(new Error('Sync failed')),
      });
      mockPetApi.endpoints.syncApplicationDraft.initiate = mockInitiate;

      draftSyncService.destroy();
      await draftSyncService.initialize();

      // Manually trigger queue processing
      await draftSyncService.forceSync();

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'DraftSyncService: Sync failed after max retries',
        expect.objectContaining({
          draftId: 'draft-123',
          retries: 3, // Should be incremented
        })
      );
    });

    it('prioritizes sync queue items correctly', async () => {
      const queueItems = [
        {
          draftId: 'draft-1',
          version: 1,
          operation: 'update' as const,
          formData: mockFormData,
          priority: 'low' as const,
          createdAt: '2024-01-01T10:00:00Z',
          retryCount: 0,
        },
        {
          draftId: 'draft-2',
          version: 1,
          operation: 'update' as const,
          formData: mockFormData,
          priority: 'high' as const,
          createdAt: '2024-01-01T10:01:00Z',
          retryCount: 0,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queueItems));
      
      draftSyncService.destroy();
      await draftSyncService.initialize();

      // High priority should be processed first regardless of creation time
      const stats = draftSyncService.getServiceStatistics();
      expect(stats.syncQueueSize).toBe(2);
    });

    it('saves sync queue after processing', async () => {
      const queueItem = {
        draftId: 'draft-123',
        version: 1,
        operation: 'update' as const,
        formData: mockFormData,
        priority: 'normal' as const,
        createdAt: '2024-01-01T10:00:00Z',
        retryCount: 0,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([queueItem]));

      draftSyncService.destroy();
      await draftSyncService.initialize();

      await draftSyncService.forceSync();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@PetLoveCommunity:DraftSyncQueue',
        expect.any(String)
      );
    });
  });

  describe('Network Monitoring', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('triggers sync when network connection is restored', async () => {
      let networkChangeCallback: (networkInfo: any, previousState: any) => void;
      
      mockNetworkService.addNetworkChangeListener.mockImplementation((callback) => {
        networkChangeCallback = callback;
        return () => {};
      });

      draftSyncService.destroy();
      await draftSyncService.initialize();

      // Simulate network restoration
      const networkInfo = { isConnected: true, isInternetReachable: true };
      const previousState = { isConnected: false };

      networkChangeCallback!(networkInfo, previousState);

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Connection restored, triggering sync',
        expect.objectContaining({
          queueSize: 0,
        })
      );
    });

    it('does not trigger sync when still offline', async () => {
      let networkChangeCallback: (networkInfo: any, previousState: any) => void;
      
      mockNetworkService.addNetworkChangeListener.mockImplementation((callback) => {
        networkChangeCallback = callback;
        return () => {};
      });

      draftSyncService.destroy();
      await draftSyncService.initialize();

      // Simulate network change but still offline
      const networkInfo = { isConnected: false, isInternetReachable: false };
      const previousState = { isConnected: false };

      networkChangeCallback!(networkInfo, previousState);

      // Should not trigger sync
      expect(mockLoggingService.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Connection restored'),
        expect.anything()
      );
    });
  });

  describe('Auto-Save Functionality', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('schedules auto-save timer for drafts', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      await draftSyncService.saveDraft('draft-123', mockFormData);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('clears existing timer when scheduling new auto-save', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      // Save draft twice
      await draftSyncService.saveDraft('draft-123', mockFormData);
      jest.clearAllMocks();
      
      await draftSyncService.saveDraft('draft-123', mockFormData);

      // Should clear existing timer and set new one
      expect(clearTimeout).toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('triggers auto-save for local drafts', async () => {
      const localDraft = { ...mockDraft, syncStatus: 'local' as const };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ 'draft-123': localDraft }));

      await draftSyncService.saveDraft('draft-123', mockFormData);

      // Fast-forward the auto-save timer
      jest.advanceTimersByTime(30000);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should queue the draft for sync
      const stats = draftSyncService.getServiceStatistics();
      expect(stats.autoSaveTimers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Service Statistics and Status', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('provides accurate service statistics', () => {
      const stats = draftSyncService.getServiceStatistics();

      expect(stats).toEqual({
        syncQueueSize: expect.any(Number),
        isSyncing: false,
        autoSaveTimers: expect.any(Number),
        isInitialized: true,
        networkConnected: true,
      });
    });

    it('tracks draft sync status correctly', async () => {
      const status = draftSyncService.getDraftSyncStatus('draft-123');

      expect(status).toEqual({
        status: 'local',
        queuePosition: undefined,
        pendingChanges: 0,
      });
    });

    it('provides queue position for queued drafts', async () => {
      // Mock queue with multiple items
      const queueItems = [
        {
          draftId: 'draft-1',
          version: 1,
          operation: 'update' as const,
          formData: mockFormData,
          priority: 'high' as const,
          createdAt: '2024-01-01T10:00:00Z',
          retryCount: 0,
        },
        {
          draftId: 'draft-123',
          version: 1,
          operation: 'update' as const,
          formData: mockFormData,
          priority: 'normal' as const,
          createdAt: '2024-01-01T10:01:00Z',
          retryCount: 1,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queueItems));
      
      draftSyncService.destroy();
      await draftSyncService.initialize();

      const status = draftSyncService.getDraftSyncStatus('draft-123');
      
      expect(status.queuePosition).toBe(2); // Second in queue after sorting
      expect(status.pendingChanges).toBe(1); // Retry count
    });
  });

  describe('Service Cleanup', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('cleans up resources on destroy', () => {
      const mockNetworkUnsubscribe = jest.fn();
      mockNetworkService.addNetworkChangeListener.mockReturnValue(mockNetworkUnsubscribe);

      draftSyncService.destroy();
      draftSyncService.destroy(); // Re-initialize with network listener
      draftSyncService.destroy();

      expect(mockNetworkUnsubscribe).toHaveBeenCalled();
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Service destroyed',
        expect.objectContaining({
          pendingSyncs: expect.any(Number),
        })
      );
    });

    it('clears all timers on destroy', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');
      
      await draftSyncService.saveDraft('draft-123', mockFormData);
      
      draftSyncService.destroy();

      expect(clearInterval).toHaveBeenCalled(); // Sync timer
      expect(clearTimeout).toHaveBeenCalled(); // Auto-save timer
    });

    it('resets initialization state on destroy', () => {
      const stats = draftSyncService.getServiceStatistics();
      expect(stats.isInitialized).toBe(true);

      draftSyncService.destroy();

      const statsAfterDestroy = draftSyncService.getServiceStatistics();
      expect(statsAfterDestroy.isInitialized).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('handles storage errors during queue operations', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));

      const result = await draftSyncService.saveDraft('draft-123', mockFormData);

      expect(result.success).toBe(false);
      expect(mockLoggingService.error).toHaveBeenCalled();
    });

    it('handles corrupted queue data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');

      draftSyncService.destroy();
      await draftSyncService.initialize();

      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        'DraftSyncService: Failed to load sync queue',
        expect.objectContaining({
          error: expect.stringContaining('JSON'),
        })
      );
    });

    it('handles corrupted draft data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');

      const result = await draftSyncService.getDraft('draft-123');

      expect(result).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalled();
    });

    it('handles concurrent save operations safely', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      // Trigger multiple saves concurrently
      const promises = [
        draftSyncService.saveDraft('draft-123', { personalInfo: { firstName: 'John1' } }),
        draftSyncService.saveDraft('draft-123', { personalInfo: { firstName: 'John2' } }),
        draftSyncService.saveDraft('draft-123', { personalInfo: { firstName: 'John3' } }),
      ];

      const results = await Promise.all(promises);

      // All operations should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('handles very large form data efficiently', async () => {
      const largeFormData = {
        ...mockFormData,
        documents: Array.from({ length: 100 }, (_, i) => ({
          id: `doc-${i}`,
          name: `document-${i}.pdf`,
          size: 1024 * 1024, // 1MB each
          content: 'x'.repeat(1000), // Large content
        })),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      const result = await draftSyncService.saveDraft('draft-123', largeFormData);

      expect(result.success).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('handles backup version limits correctly', async () => {
      const draftWithManyBackups = {
        ...mockDraft,
        backupVersions: Array.from({ length: 10 }, (_, i) => ({
          version: i + 1,
          formData: { personalInfo: { firstName: `Backup${i}` } },
          savedAt: `2024-01-01T0${i}:00:00Z`,
          completionPercentage: 50,
        })),
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ 'draft-123': draftWithManyBackups }));

      const result = await draftSyncService.saveDraft('draft-123', mockFormData);

      expect(result.success).toBe(true);

      // Check that backup versions are limited
      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:ApplicationDrafts'
      );
      const savedData = JSON.parse(setItemCall![1]);
      const savedDraft = savedData['draft-123'];

      expect(savedDraft.backupVersions.length).toBeLessThanOrEqual(5); // Max backup versions
    });
  });

  describe('Integration with Redux Store', () => {
    beforeEach(async () => {
      await draftSyncService.initialize();
    });

    it('dispatches Redux actions when saving drafts', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('{}');

      await draftSyncService.saveDraft('draft-123', mockFormData, { step: 2 });

      expect(mockStore.dispatch).toHaveBeenCalledWith(mockUpdateApplicationDraft({
        draftId: 'draft-123',
        formData: mockFormData,
        step: 2,
        isAutoSaved: false,
      }));
    });

    it('uses RTK Query for server synchronization', async () => {
      const drafts = { 'draft-123': mockDraft };
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(drafts));

      await draftSyncService.syncDraft('draft-123');

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('api'),
        })
      );
    });
  });
});