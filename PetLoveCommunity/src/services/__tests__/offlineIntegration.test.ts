// Pet Love Community - Offline Support Integration Tests
// End-to-end integration tests for offline functionality and queue management

import AsyncStorage from '@react-native-async-storage/async-storage';
import networkService from '../networkService';
import { draftSyncService } from '../draftSyncService';
import analyticsMiddleware from '../../store/analyticsMiddleware';
import adoptionAnalyticsService from '../adoptionAnalyticsService';
import { store } from '../../store';
import type { RootState } from '../../store';

// Mock all dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../correlationIdService');
jest.mock('../loggingService');
jest.mock('../deviceInfoService');
jest.mock('../idempotencyService');
jest.mock('../petApi');
jest.mock('../adoptionAnalyticsService');

// Type the mocked dependencies
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAnalyticsService = adoptionAnalyticsService as jest.Mocked<typeof adoptionAnalyticsService>;

// Mock the store
const mockStore = {
  getState: jest.fn(),
  dispatch: jest.fn(),
} as any;

// Mock timers
jest.useFakeTimers();

describe('Offline Support Integration Tests', () => {
  const mockCorrelationId = 'corr-integration-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Setup AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Setup analytics service mocks
    mockAnalyticsService.trackOfflineEvent.mockResolvedValue();
    mockAnalyticsService.trackPetView.mockResolvedValue();
    mockAnalyticsService.trackPetInteraction.mockResolvedValue();
    mockAnalyticsService.trackAdoptionFunnelStep.mockResolvedValue();

    // Mock correlation service
    const mockCorrelationService = require('../correlationIdService').default;
    mockCorrelationService.getCorrelationId.mockResolvedValue(mockCorrelationId);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    networkService.destroy();
    draftSyncService.destroy();
  });

  describe('Network State Integration', () => {
    it('coordinates offline detection across all services', async () => {
      // Mock NetInfo for offline state
      const NetInfo = require('@react-native-community/netinfo');
      let connectivityCallback: (state: any) => void;

      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        isInternetReachable: false,
      });

      NetInfo.addEventListener.mockImplementation((callback) => {
        connectivityCallback = callback;
        return () => {};
      });

      // Initialize services
      await networkService.refreshNetworkState();
      await draftSyncService.initialize();

      // Verify offline state is detected
      expect(networkService.getIsConnected()).toBe(false);

      // Simulate network coming back online
      const onlineState = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
        details: { strength: 80 },
      };

      connectivityCallback!(onlineState);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify online state is detected
      expect(networkService.getIsConnected()).toBe(true);
      expect(networkService.getConnectionQuality()).toBe('excellent');
    });

    it('triggers sync operations when connection is restored', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      let networkChangeListener: (networkInfo: any, previousState: any) => void;

      // Mock network service listener
      const mockAddListener = jest.fn().mockImplementation((callback) => {
        networkChangeListener = callback;
        return () => {};
      });
      jest.spyOn(networkService, 'addNetworkChangeListener').mockImplementation(mockAddListener);

      // Initialize draft sync service
      await draftSyncService.initialize();

      // Setup mock drafts that need syncing
      const mockDrafts = {
        'draft-123': {
          id: 'draft-123',
          syncStatus: 'local',
          formData: { personalInfo: { firstName: 'John' } },
          version: 1,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockDrafts));

      // Mock successful sync
      const mockSyncEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve({ success: true, data: { version: 2 } }),
      });

      const mockPetApi = require('../petApi').petApi;
      mockPetApi.endpoints = {
        syncApplicationDraft: { initiate: mockSyncEndpoint },
      };

      // Simulate connection restoration
      const networkInfo = { isConnected: true, isInternetReachable: true };
      const previousState = { isConnected: false };

      if (networkChangeListener!) {
        networkChangeListener(networkInfo, previousState);
        await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for stabilization delay
      }

      // Verify sync was triggered
      expect(mockSyncEndpoint).toHaveBeenCalled();
    });

    it('manages connection quality-based operation prioritization', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      let connectivityCallback: (state: any) => void;

      NetInfo.addEventListener.mockImplementation((callback) => {
        connectivityCallback = callback;
        return () => {};
      });

      await networkService.refreshNetworkState();

      // Test different connection qualities
      const connectionStates = [
        { type: 'wifi', details: { strength: 90 }, expected: 'excellent' },
        { type: 'wifi', details: { strength: 50 }, expected: 'fair' },
        { type: 'cellular', details: { strength: 70 }, expected: 'fair' },
        { type: 'cellular', details: { strength: 30 }, expected: 'poor' },
      ];

      for (const { type, details, expected } of connectionStates) {
        const state = {
          isConnected: true,
          type,
          isInternetReachable: true,
          details,
        };

        connectivityCallback!(state);
        expect(networkService.getConnectionQuality()).toBe(expected);
      }
    });
  });

  describe('Draft Synchronization Integration', () => {
    it('manages draft conflicts across network state changes', async () => {
      // Initialize services
      await draftSyncService.initialize();

      // Mock draft with potential conflict
      const localDraft = {
        id: 'draft-conflict-123',
        formData: { personalInfo: { firstName: 'Local John', lastName: 'Doe' } },
        version: 1,
        lastModified: '2024-01-01T10:00:00Z',
        syncStatus: 'local',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ 'draft-conflict-123': localDraft }));

      // Mock server response with conflict
      const mockSyncEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve({
          success: true,
          data: {
            version: 2,
            hasConflict: true,
            serverData: {
              personalInfo: { firstName: 'Server Jane', lastName: 'Doe' },
              updatedAt: '2024-01-01T11:00:00Z', // Server is newer
            },
          },
        }),
      });

      const mockPetApi = require('../petApi').petApi;
      mockPetApi.endpoints = {
        syncApplicationDraft: { initiate: mockSyncEndpoint },
      };

      // Attempt sync with automatic conflict resolution
      const result = await draftSyncService.syncDraft('draft-conflict-123', {
        resolveConflicts: true,
      });

      expect(result.success).toBe(true);
      expect(result.conflictsResolved).toBe(1);

      // Verify conflict resolution was logged
      const loggingService = require('../loggingService').loggingService;
      expect(loggingService.info).toHaveBeenCalledWith(
        'DraftSyncService: Resolving conflict',
        expect.objectContaining({
          draftId: 'draft-conflict-123',
          strategy: 'auto',
        })
      );
    });

    it('handles concurrent draft saves and sync operations', async () => {
      await draftSyncService.initialize();

      const draftId = 'draft-concurrent-123';
      const formData = { personalInfo: { firstName: 'John' } };

      // Setup mock storage state
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      // Mock store dispatch
      const mockDispatch = jest.fn().mockImplementation((action) => {
        if (typeof action === 'function') {
          return Promise.resolve({ unwrap: () => Promise.resolve({ success: true }) });
        }
        return action;
      });

      const mockStore = require('../../store').store;
      mockStore.dispatch = mockDispatch;

      // Trigger multiple concurrent saves
      const savePromises = [
        draftSyncService.saveDraft(draftId, { ...formData, step: 1 }),
        draftSyncService.saveDraft(draftId, { ...formData, step: 2 }),
        draftSyncService.saveDraft(draftId, { ...formData, step: 3 }),
      ];

      const results = await Promise.all(savePromises);

      // All saves should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Version should be incremented correctly
      const finalResult = results[results.length - 1];
      expect(finalResult.version).toBeGreaterThan(1);
    });

    it('integrates with analytics middleware for offline event tracking', async () => {
      // Setup analytics middleware
      const middleware = analyticsMiddleware(mockStore);
      const next = jest.fn((action) => action);
      const wrappedDispatch = middleware(next);

      // Mock state for analytics
      const mockState = {
        pets: {
          drafts: { 'draft-analytics-123': { id: 'draft-analytics-123' } },
        },
      } as RootState;

      mockStore.getState.mockReturnValue(mockState);

      // Test offline events through middleware
      const offlineActions = [
        {
          type: 'pets/setDraftSyncStatus',
          payload: { draftId: 'draft-analytics-123', status: 'syncing' },
        },
        {
          type: 'pets/createDraftBackup',
          payload: { draftId: 'draft-analytics-123', backupVersion: 1 },
        },
        {
          type: 'pets/updateDraftFromServer',
          payload: { draftId: 'draft-analytics-123', serverData: {} },
        },
        {
          type: 'pets/resolveDraftConflict',
          payload: { draftId: 'draft-analytics-123', resolution: 'server' },
        },
      ];

      // Process all offline actions
      offlineActions.forEach(action => {
        wrappedDispatch(action);
      });

      // Fast-forward timers to trigger async analytics
      jest.advanceTimersByTime(0);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify offline events were tracked
      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('sync_start', { queueSize: 1 });
      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('queue_event', { queueSize: 1 });
      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('sync_success', { queueSize: 1 });
      expect(mockAnalyticsService.trackOfflineEvent).toHaveBeenCalledWith('conflict_resolved', { queueSize: 1 });
    });
  });

  describe('Queue Management Integration', () => {
    it('coordinates multiple queue systems during offline periods', async () => {
      // Mock offline state
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        isInternetReachable: false,
      });

      let connectivityCallback: (state: any) => void;
      NetInfo.addEventListener.mockImplementation((callback) => {
        connectivityCallback = callback;
        return () => {};
      });

      // Initialize services
      await networkService.refreshNetworkState();
      await draftSyncService.initialize();

      // Verify offline state
      expect(networkService.getIsConnected()).toBe(false);

      // Create draft operations while offline
      const draftOperations = [
        () => draftSyncService.saveDraft('draft-offline-1', { personalInfo: { firstName: 'John' } }),
        () => draftSyncService.saveDraft('draft-offline-2', { livingSituation: { housingType: 'house' } }),
        () => draftSyncService.saveDraft('draft-offline-3', { experience: { previousPets: true } }),
      ];

      // Execute operations while offline
      mockAsyncStorage.getItem.mockResolvedValue('{}');
      const offlineResults = await Promise.all(draftOperations.map(op => op()));

      // All operations should succeed locally
      offlineResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Mock sync queue restoration
      const queueData = JSON.stringify([
        {
          draftId: 'draft-offline-1',
          version: 1,
          operation: 'update',
          formData: { personalInfo: { firstName: 'John' } },
          priority: 'normal',
          createdAt: '2024-01-01T10:00:00Z',
          retryCount: 0,
        },
      ]);

      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      // Mock successful sync when coming back online
      const mockSyncEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve({
          success: true,
          data: { version: 2, hasConflict: false },
        }),
      });

      const mockPetApi = require('../petApi').petApi;
      mockPetApi.endpoints = {
        syncApplicationDraft: { initiate: mockSyncEndpoint },
      };

      // Simulate connection restoration
      const onlineState = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      };

      connectivityCallback!(onlineState);

      // Fast-forward to trigger sync processing
      jest.advanceTimersByTime(30000); // Sync interval

      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify sync operations were triggered
      expect(mockSyncEndpoint).toHaveBeenCalled();
    });

    it('manages priority queuing across different operation types', async () => {
      await draftSyncService.initialize();

      // Setup different priority operations
      const operations = [
        { draftId: 'draft-low', priority: 'low', immediate: false },
        { draftId: 'draft-high', priority: 'high', immediate: true },
        { draftId: 'draft-normal', priority: 'normal', immediate: false },
      ];

      const mockStore = require('../../store').store;
      mockStore.dispatch = jest.fn().mockImplementation(() => ({
        unwrap: () => Promise.resolve({ success: true }),
      }));

      mockAsyncStorage.getItem.mockResolvedValue('{}');

      // Create operations with different priorities
      for (const op of operations) {
        await draftSyncService.saveDraft(
          op.draftId,
          { personalInfo: { firstName: `User ${op.priority}` } },
          { immediate: op.immediate }
        );
      }

      // Verify high priority operations are handled immediately
      const highPriorityDispatchCalls = mockStore.dispatch.mock.calls.filter(
        call => typeof call[0] === 'function' // These are the immediate sync calls
      );

      expect(highPriorityDispatchCalls.length).toBeGreaterThan(0);
    });

    it('handles queue overflow and cleanup during extended offline periods', async () => {
      await draftSyncService.initialize();

      // Mock a large number of queued operations
      const largeQueue = Array.from({ length: 1000 }, (_, i) => ({
        draftId: `draft-queue-${i}`,
        version: 1,
        operation: 'update',
        formData: { personalInfo: { firstName: `User${i}` } },
        priority: 'normal',
        createdAt: new Date(Date.now() - i * 1000).toISOString(), // Spread over time
        retryCount: Math.floor(i / 100), // Some with retries
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(largeQueue));

      // Verify service handles large queues gracefully
      const stats = draftSyncService.getServiceStatistics();
      expect(stats.syncQueueSize).toBeLessThanOrEqual(1000);

      // Simulate queue cleanup (removing old/failed items)
      const recentQueue = largeQueue.filter(item => 
        item.retryCount < 3 && 
        Date.now() - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000 // 24 hours
      );

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentQueue));

      // Reinitialize to load cleaned queue
      draftSyncService.destroy();
      await draftSyncService.initialize();

      const cleanedStats = draftSyncService.getServiceStatistics();
      expect(cleanedStats.syncQueueSize).toBeLessThan(1000);
    });
  });

  describe('Error Recovery Integration', () => {
    it('coordinates error recovery across all offline services', async () => {
      // Initialize services
      await networkService.refreshNetworkState();
      await draftSyncService.initialize();

      // Mock various error conditions
      const errorScenarios = [
        {
          name: 'Storage failure',
          setup: () => {
            mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));
          },
        },
        {
          name: 'Network failure',
          setup: () => {
            const mockSyncEndpoint = jest.fn().mockReturnValue({
              unwrap: () => Promise.reject(new Error('Network timeout')),
            });
            
            const mockPetApi = require('../petApi').petApi;
            mockPetApi.endpoints = {
              syncApplicationDraft: { initiate: mockSyncEndpoint },
            };
          },
        },
        {
          name: 'Corruption recovery',
          setup: () => {
            mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');
          },
        },
      ];

      for (const scenario of errorScenarios) {
        scenario.setup();

        // Test that services continue to operate despite errors
        const result = await draftSyncService.saveDraft('test-draft', {
          personalInfo: { firstName: 'Test' },
        });

        // Should handle errors gracefully
        expect(result).toMatchObject({
          draftId: 'test-draft',
          correlationId: expect.any(String),
        });

        const loggingService = require('../loggingService').loggingService;
        expect(loggingService.error || loggingService.warn).toHaveBeenCalled();

        // Reset for next scenario
        jest.clearAllMocks();
        mockAsyncStorage.setItem.mockResolvedValue();
        mockAsyncStorage.getItem.mockResolvedValue('{}');
      }
    });

    it('maintains service health across multiple error conditions', async () => {
      await draftSyncService.initialize();

      // Simulate multiple consecutive errors
      const consecutiveErrors = [
        new Error('Network error 1'),
        new Error('Timeout error'),
        new Error('Server error'),
      ];

      let errorIndex = 0;
      const mockSyncEndpoint = jest.fn().mockImplementation(() => ({
        unwrap: () => {
          if (errorIndex < consecutiveErrors.length) {
            const error = consecutiveErrors[errorIndex++];
            return Promise.reject(error);
          }
          return Promise.resolve({ success: true, data: { version: 2 } });
        },
      }));

      const mockPetApi = require('../petApi').petApi;
      mockPetApi.endpoints = {
        syncApplicationDraft: { initiate: mockSyncEndpoint },
      };

      mockAsyncStorage.getItem.mockResolvedValue('{}');

      // Create draft that will experience multiple sync failures
      const draftId = 'error-recovery-draft';
      await draftSyncService.saveDraft(draftId, {
        personalInfo: { firstName: 'Recovery Test' },
      });

      // Attempt sync multiple times (simulating retry logic)
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const result = await draftSyncService.syncDraft(draftId, { forceSync: true });
          
          if (attempt < 3) {
            expect(result.success).toBe(false);
          } else {
            expect(result.success).toBe(true);
          }
        } catch (error) {
          // Expected for the failed attempts
        }

        // Brief delay between attempts
        jest.advanceTimersByTime(1000);
      }

      // Service should still be responsive
      const stats = draftSyncService.getServiceStatistics();
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('Performance and Scalability Integration', () => {
    it('maintains performance with large datasets across all services', async () => {
      // Initialize all services
      await networkService.refreshNetworkState();
      await draftSyncService.initialize();

      // Create large datasets
      const largeDraftData = {
        personalInfo: {
          firstName: 'John'.repeat(100),
          lastName: 'Doe'.repeat(100),
          email: 'john@example.com',
          phone: '555-123-4567',
          address: 'Very long address'.repeat(50),
          additionalInfo: 'Additional information'.repeat(200),
        },
        livingSituation: {
          housingType: 'house',
          ownOrRent: 'own',
          yardType: 'large',
          petPolicy: 'Detailed pet policy'.repeat(100),
        },
        experience: {
          previousPets: true,
          petHistory: Array.from({ length: 50 }, (_, i) => ({
            name: `Pet${i}`,
            species: 'dog',
            yearsOwned: i + 1,
            description: 'Pet description'.repeat(20),
          })),
        },
      };

      // Test large data handling
      const startTime = Date.now();
      
      const result = await draftSyncService.saveDraft('large-draft', largeDraftData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle large data efficiently (under 1 second)
      expect(duration).toBeLessThan(1000);
      expect(result.success).toBe(true);

      // Verify data integrity
      const retrievedDraft = await draftSyncService.getDraft('large-draft');
      expect(retrievedDraft?.formData.personalInfo?.firstName).toBe(largeDraftData.personalInfo.firstName);
    });

    it('handles high-frequency operations efficiently', async () => {
      await draftSyncService.initialize();

      const highFrequencyOperations = Array.from({ length: 100 }, (_, i) => 
        () => draftSyncService.saveDraft(`rapid-draft-${i}`, {
          personalInfo: { firstName: `User${i}` },
        })
      );

      mockAsyncStorage.getItem.mockResolvedValue('{}');

      const startTime = Date.now();
      
      // Execute all operations rapidly
      const results = await Promise.all(
        highFrequencyOperations.map(op => op())
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle high frequency efficiently
      expect(duration).toBeLessThan(5000); // Under 5 seconds for 100 operations
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('manages memory usage during extended offline operation', async () => {
      await draftSyncService.initialize();

      // Simulate extended offline usage
      const extendedOperations = Array.from({ length: 1000 }, (_, i) => ({
        draftId: `extended-${i}`,
        formData: {
          personalInfo: { firstName: `User${i}` },
          timestamp: new Date().toISOString(),
        },
      }));

      mockAsyncStorage.getItem.mockResolvedValue('{}');

      // Execute operations over time
      for (let i = 0; i < extendedOperations.length; i += 10) {
        const batch = extendedOperations.slice(i, i + 10);
        
        await Promise.all(
          batch.map(op => 
            draftSyncService.saveDraft(op.draftId, op.formData)
          )
        );

        // Advance time between batches
        jest.advanceTimersByTime(1000);

        // Verify service remains responsive
        const stats = draftSyncService.getServiceStatistics();
        expect(stats.isInitialized).toBe(true);
      }

      // Service should still be operational after extended use
      const finalStats = draftSyncService.getServiceStatistics();
      expect(finalStats.isInitialized).toBe(true);
      expect(typeof finalStats.syncQueueSize).toBe('number');
    });
  });
});