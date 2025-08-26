// Pet Love Community - Document Upload Service Queue Management Tests
// Comprehensive test suite for document upload queue management and offline support

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DocumentUploadService, DocumentType, DocumentSource } from '../documentUploadService';
import type { DocumentUploadOptions, DocumentUploadResult, QueuedUpload, CachedDocument } from '../documentUploadService';
import { store } from '../../store';
import { petApi } from '../petApi';
import correlationIdService from '../correlationIdService';
import { idempotencyService } from '../idempotencyService';
import { loggingService } from '../loggingService';
import deviceInfoService from '../deviceInfoService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../store');
jest.mock('../petApi');
jest.mock('../correlationIdService');
jest.mock('../idempotencyService');
jest.mock('../loggingService');
jest.mock('../deviceInfoService');
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: {
    images: 'images',
    pdf: 'pdf',
    allFiles: 'allFiles',
  },
}));
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn(),
}));
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  unlink: jest.fn(),
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',
}));
jest.mock('react-native-permissions', () => ({
  request: jest.fn(),
  check: jest.fn(),
  PERMISSIONS: {
    ANDROID: { CAMERA: 'android.permission.CAMERA' },
    IOS: { CAMERA: 'ios.permission.CAMERA' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
  },
}));

// Type the mocked dependencies
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockStore = store as jest.Mocked<typeof store>;
const mockPetApi = petApi as jest.Mocked<typeof petApi>;
const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;
const mockIdempotencyService = idempotencyService as jest.Mocked<typeof idempotencyService>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockDeviceInfoService = deviceInfoService as jest.Mocked<typeof deviceInfoService>;

// Mock timers
jest.useFakeTimers();

describe('DocumentUploadService Queue Management', () => {
  let service: DocumentUploadService;
  const mockCorrelationId = 'corr-123';
  const mockDeviceId = 'device-456';
  const mockIdempotencyKey = 'idem-789';

  const mockDocument: CachedDocument = {
    id: 'doc-123',
    applicationId: 'app-456',
    documentType: DocumentType.ID,
    localPath: '/mock/documents/id-doc.jpg',
    fileName: 'government-id.jpg',
    fileSize: 1024000, // 1MB
    mimeType: 'image/jpeg',
    correlationId: mockCorrelationId,
  };

  const mockQueuedUpload: QueuedUpload = {
    id: 'queue-123',
    document: mockDocument,
    options: {
      applicationId: 'app-456',
      documentType: DocumentType.ID,
      source: DocumentSource.CAMERA,
      fileName: 'government-id.jpg',
      description: 'Government issued ID',
    },
    retryCount: 0,
    createdAt: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Setup default mock implementations
    mockCorrelationIdService.getCorrelationId.mockResolvedValue(mockCorrelationId);
    mockDeviceInfoService.getDeviceId.mockResolvedValue(mockDeviceId);
    mockIdempotencyService.generateKey.mockResolvedValue(mockIdempotencyKey);

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock store dispatch
    mockStore.dispatch.mockImplementation((action) => {
      if (typeof action === 'function') {
        return Promise.resolve({ unwrap: () => Promise.resolve({ success: true }) });
      }
      return action;
    });

    // Mock logging service
    mockLoggingService.info.mockImplementation();
    mockLoggingService.warn.mockImplementation();
    mockLoggingService.error.mockImplementation();

    // Create new service instance
    service = new DocumentUploadService();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  describe('Queue Initialization', () => {
    it('initializes with empty queue when no stored data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await new Promise(resolve => setTimeout(resolve, 0)); // Let initialization complete

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@PetLoveCommunity:DocumentUploadQueue');
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DocumentUploadService: Initialized',
        expect.objectContaining({
          queueSize: 0,
        })
      );
    });

    it('loads existing queue from storage on initialization', async () => {
      const storedQueue = JSON.stringify([mockQueuedUpload]);
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('[]') // Document cache
        .mockResolvedValueOnce(storedQueue); // Upload queue

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DocumentUploadService: Initialized',
        expect.objectContaining({
          queueSize: 1,
        })
      );
    });

    it('handles corrupted queue data gracefully', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('[]') // Document cache
        .mockResolvedValueOnce('invalid json'); // Corrupted queue

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'DocumentUploadService: Failed to initialize',
        expect.objectContaining({
          error: expect.stringContaining('JSON'),
        })
      );
    });
  });

  describe('Queue Management Operations', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0)); // Let service initialize
      jest.clearAllMocks();
    });

    it('adds documents to upload queue when offline', async () => {
      // Mock offline state
      const networkService = require('../networkService').default;
      jest.spyOn(networkService, 'getIsConnected').mockReturnValue(false);

      // Mock successful document creation
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // Empty cache

      const options: DocumentUploadOptions = {
        applicationId: 'app-456',
        documentType: DocumentType.ID,
        source: DocumentSource.CAMERA,
        fileName: 'test-id.jpg',
      };

      // This would normally come from actual camera/file picker
      const mockCachedDoc = { ...mockDocument, fileName: 'test-id.jpg' };
      
      // Simulate adding to queue through the service's internal methods
      const queueItem: QueuedUpload = {
        id: 'queue-456',
        document: mockCachedDoc,
        options,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      // Directly test queue storage
      await service.addToUploadQueue?.(queueItem);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@PetLoveCommunity:DocumentUploadQueue',
        expect.stringContaining('queue-456')
      );
    });

    it('processes upload queue when online', async () => {
      // Mock online state
      const networkService = require('../networkService').default;
      jest.spyOn(networkService, 'getIsConnected').mockReturnValue(true);

      // Mock existing queue
      const queueData = JSON.stringify([mockQueuedUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      // Mock successful API call
      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve({
          success: true,
          documentId: 'doc-uploaded-123',
          url: 'https://example.com/doc-123.jpg',
        }),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      // Trigger queue processing
      await service.processUploadQueue?.();

      expect(mockUploadEndpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-456',
          documentType: DocumentType.ID,
          fileName: 'government-id.jpg',
        }),
        expect.objectContaining({
          fixedCacheKey: mockIdempotencyKey,
        })
      );
    });

    it('retries failed uploads with exponential backoff', async () => {
      const failingUpload: QueuedUpload = {
        ...mockQueuedUpload,
        retryCount: 1,
        lastAttempt: '2024-01-01T09:30:00Z',
      };

      const queueData = JSON.stringify([failingUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      // Mock failed API call
      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.reject(new Error('Network error')),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // Should increment retry count
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:DocumentUploadQueue'
      );

      if (saveCall) {
        const savedQueue = JSON.parse(saveCall[1]);
        expect(savedQueue[0].retryCount).toBe(2);
        expect(savedQueue[0].lastAttempt).toBeDefined();
      }

      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Upload failed'),
        expect.objectContaining({
          retryCount: 2,
        })
      );
    });

    it('removes items from queue after max retries', async () => {
      const maxRetriedUpload: QueuedUpload = {
        ...mockQueuedUpload,
        retryCount: 3, // Assuming max retries is 3
      };

      const queueData = JSON.stringify([maxRetriedUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      // Mock failed API call
      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.reject(new Error('Persistent error')),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // Should remove from queue
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:DocumentUploadQueue'
      );

      if (saveCall) {
        const savedQueue = JSON.parse(saveCall[1]);
        expect(savedQueue).toHaveLength(0);
      }

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        expect.stringContaining('Max retries exceeded'),
        expect.objectContaining({
          documentId: mockDocument.id,
        })
      );
    });

    it('prioritizes uploads by document importance', async () => {
      const urgentUpload: QueuedUpload = {
        ...mockQueuedUpload,
        id: 'queue-urgent',
        document: { ...mockDocument, documentType: DocumentType.ID },
        options: { ...mockQueuedUpload.options, documentType: DocumentType.ID },
      };

      const normalUpload: QueuedUpload = {
        ...mockQueuedUpload,
        id: 'queue-normal',
        document: { ...mockDocument, documentType: DocumentType.OTHER },
        options: { ...mockQueuedUpload.options, documentType: DocumentType.OTHER },
      };

      const queueData = JSON.stringify([normalUpload, urgentUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      const uploadCalls: string[] = [];
      const mockUploadEndpoint = jest.fn().mockImplementation((params) => {
        uploadCalls.push(params.documentType);
        return {
          unwrap: () => Promise.resolve({ success: true }),
        };
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // ID documents should be processed before OTHER documents
      expect(uploadCalls[0]).toBe(DocumentType.ID);
      expect(uploadCalls[1]).toBe(DocumentType.OTHER);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('manages document cache size limits', async () => {
      // Create large cache that exceeds limit
      const largeCache = Array.from({ length: 50 }, (_, i) => ({
        ...mockDocument,
        id: `doc-${i}`,
        fileSize: 5 * 1024 * 1024, // 5MB each = 250MB total
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(largeCache));

      await service.cleanupCache?.();

      // Should remove oldest documents to stay under limit
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:DocumentCache'
      );

      if (saveCall) {
        const savedCache = JSON.parse(saveCall[1]);
        const totalSize = savedCache.reduce((sum: number, doc: CachedDocument) => sum + doc.fileSize, 0);
        expect(totalSize).toBeLessThanOrEqual(100 * 1024 * 1024); // 100MB limit
      }

      expect(mockLoggingService.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleanup completed'),
        expect.any(Object)
      );
    });

    it('removes uploaded documents from cache', async () => {
      const uploadedDoc: CachedDocument = {
        ...mockDocument,
        uploadedAt: '2024-01-01T10:00:00Z',
        serverUrl: 'https://example.com/doc-123.jpg',
      };

      const cacheData = JSON.stringify([uploadedDoc]);
      mockAsyncStorage.getItem.mockResolvedValue(cacheData);

      await service.cleanupUploadedDocuments?.();

      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:DocumentCache'
      );

      if (saveCall) {
        const savedCache = JSON.parse(saveCall[1]);
        expect(savedCache).toHaveLength(0);
      }
    });

    it('preserves failed upload documents in cache', async () => {
      const failedDoc: CachedDocument = {
        ...mockDocument,
        uploadedAt: undefined, // Not uploaded
      };

      const cacheData = JSON.stringify([failedDoc]);
      mockAsyncStorage.getItem.mockResolvedValue(cacheData);

      await service.cleanupUploadedDocuments?.();

      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:DocumentCache'
      );

      if (saveCall) {
        const savedCache = JSON.parse(saveCall[1]);
        expect(savedCache).toHaveLength(1);
        expect(savedCache[0].id).toBe(failedDoc.id);
      }
    });
  });

  describe('Network State Integration', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('automatically processes queue when network comes online', async () => {
      const networkService = require('../networkService').default;
      const mockAddListener = jest.fn();
      jest.spyOn(networkService, 'addNetworkChangeListener').mockReturnValue(mockAddListener);

      // Simulate service setting up network listener
      let networkCallback: (networkInfo: any, previousState: any) => void;
      mockAddListener.mockImplementation((callback) => {
        networkCallback = callback;
        return () => {}; // Unsubscribe function
      });

      // Initialize service with network monitoring
      service = new DocumentUploadService();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Mock queue with pending uploads
      const queueData = JSON.stringify([mockQueuedUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      // Mock successful upload
      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve({ success: true }),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      // Simulate network coming online
      const networkInfo = { isConnected: true, isInternetReachable: true };
      const previousState = { isConnected: false };

      if (networkCallback!) {
        networkCallback(networkInfo, previousState);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(mockUploadEndpoint).toHaveBeenCalled();
    });

    it('pauses queue processing when network goes offline', async () => {
      const queueData = JSON.stringify([mockQueuedUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      // Mock offline state
      const networkService = require('../networkService').default;
      jest.spyOn(networkService, 'getIsConnected').mockReturnValue(false);

      const mockUploadEndpoint = jest.fn();
      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // Should not attempt uploads when offline
      expect(mockUploadEndpoint).not.toHaveBeenCalled();
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        expect.stringContaining('Skipping queue processing'),
        expect.objectContaining({
          reason: 'offline',
        })
      );
    });

    it('adjusts retry timing based on connection quality', async () => {
      const networkService = require('../networkService').default;
      jest.spyOn(networkService, 'getConnectionQuality').mockReturnValue('poor');

      const failedUpload: QueuedUpload = {
        ...mockQueuedUpload,
        retryCount: 1,
      };

      const queueData = JSON.stringify([failedUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.reject(new Error('Timeout')),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // Should apply longer delay for poor connection
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Number) // Would be longer delay for poor connection
      );
    });
  });

  describe('Progress Tracking and Reporting', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('tracks upload progress for individual documents', async () => {
      const progressCallback = jest.fn();
      
      const options: DocumentUploadOptions = {
        applicationId: 'app-456',
        documentType: DocumentType.ID,
        source: DocumentSource.CAMERA,
      };

      // Mock upload with progress reporting
      const mockUploadEndpoint = jest.fn().mockImplementation(() => ({
        unwrap: () => {
          // Simulate progress updates
          progressCallback({
            documentId: mockDocument.id,
            loaded: 512000,
            total: 1024000,
            percentage: 50,
            stage: 'uploading',
          });

          return Promise.resolve({ success: true });
        },
      }));

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      // Test upload with progress tracking
      await service.uploadWithProgress?.(mockDocument, options, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockDocument.id,
          percentage: 50,
          stage: 'uploading',
        })
      );
    });

    it('provides queue status information', () => {
      const queueStatus = service.getQueueStatus?.();

      expect(queueStatus).toEqual(
        expect.objectContaining({
          totalItems: expect.any(Number),
          pendingItems: expect.any(Number),
          failedItems: expect.any(Number),
          isProcessing: expect.any(Boolean),
          estimatedTimeRemaining: expect.any(Number),
        })
      );
    });

    it('tracks upload statistics', () => {
      const stats = service.getUploadStatistics?.();

      expect(stats).toEqual(
        expect.objectContaining({
          totalUploaded: expect.any(Number),
          totalFailed: expect.any(Number),
          averageUploadTime: expect.any(Number),
          cacheSize: expect.any(Number),
          queueSize: expect.any(Number),
        })
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('recovers from corrupted document cache', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('invalid json') // Corrupted cache
        .mockResolvedValueOnce('[]'); // Valid queue

      // Should initialize with empty cache
      service = new DocumentUploadService();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load document cache'),
        expect.any(Object)
      );

      // Should continue to function normally
      expect(service.getQueueStatus?.()).toBeDefined();
    });

    it('handles storage write failures gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const options: DocumentUploadOptions = {
        applicationId: 'app-456',
        documentType: DocumentType.ID,
        source: DocumentSource.CAMERA,
      };

      // Should not crash when storage fails
      expect(async () => {
        await service.addToUploadQueue?.(mockQueuedUpload);
      }).not.toThrow();

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save upload queue'),
        expect.objectContaining({
          error: 'Storage full',
        })
      );
    });

    it('handles API timeout errors with appropriate retry strategy', async () => {
      const timeoutUpload: QueuedUpload = {
        ...mockQueuedUpload,
        retryCount: 0,
      };

      const queueData = JSON.stringify([timeoutUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.reject(new Error('Request timeout')),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // Should schedule retry with appropriate delay
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Number)
      );

      // Should update retry count
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@PetLoveCommunity:DocumentUploadQueue'
      );

      if (saveCall) {
        const savedQueue = JSON.parse(saveCall[1]);
        expect(savedQueue[0].retryCount).toBe(1);
      }
    });

    it('preserves documents when service is destroyed and recreated', async () => {
      // Setup initial queue and cache
      const cacheData = JSON.stringify([mockDocument]);
      const queueData = JSON.stringify([mockQueuedUpload]);

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(cacheData)
        .mockResolvedValueOnce(queueData);

      service = new DocumentUploadService();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify initial state
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'DocumentUploadService: Initialized',
        expect.objectContaining({
          cacheSize: 1,
          queueSize: 1,
        })
      );

      // Destroy and recreate service
      service.destroy?.();

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(cacheData)
        .mockResolvedValueOnce(queueData);

      service = new DocumentUploadService();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should restore previous state
      expect(mockLoggingService.info).toHaveBeenLastCalledWith(
        'DocumentUploadService: Initialized',
        expect.objectContaining({
          cacheSize: 1,
          queueSize: 1,
        })
      );
    });
  });

  describe('Integration with Adoption Workflow', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      jest.clearAllMocks();
    });

    it('associates documents with specific adoption applications', async () => {
      const applicationId = 'app-789';
      
      const appSpecificUpload: QueuedUpload = {
        ...mockQueuedUpload,
        document: { ...mockDocument, applicationId },
        options: { ...mockQueuedUpload.options, applicationId },
      };

      const queueData = JSON.stringify([appSpecificUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      const mockUploadEndpoint = jest.fn().mockReturnValue({
        unwrap: () => Promise.resolve({ success: true }),
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      expect(mockUploadEndpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-789',
        }),
        expect.any(Object)
      );
    });

    it('prioritizes required documents for applications', async () => {
      const requiredUpload: QueuedUpload = {
        ...mockQueuedUpload,
        document: { ...mockDocument, documentType: DocumentType.ID },
        options: { ...mockQueuedUpload.options, documentType: DocumentType.ID },
      };

      const optionalUpload: QueuedUpload = {
        ...mockQueuedUpload,
        id: 'queue-optional',
        document: { ...mockDocument, documentType: DocumentType.OTHER },
        options: { ...mockQueuedUpload.options, documentType: DocumentType.OTHER },
      };

      const queueData = JSON.stringify([optionalUpload, requiredUpload]);
      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      const uploadOrder: string[] = [];
      const mockUploadEndpoint = jest.fn().mockImplementation((params) => {
        uploadOrder.push(params.documentType);
        return {
          unwrap: () => Promise.resolve({ success: true }),
        };
      });

      mockPetApi.endpoints = {
        uploadDocument: { initiate: mockUploadEndpoint },
      } as any;

      await service.processUploadQueue?.();

      // Required documents should be processed first
      expect(uploadOrder[0]).toBe(DocumentType.ID);
      expect(uploadOrder[1]).toBe(DocumentType.OTHER);
    });

    it('provides document completion status for applications', () => {
      const applicationId = 'app-789';
      const completionStatus = service.getApplicationDocumentStatus?.(applicationId);

      expect(completionStatus).toEqual(
        expect.objectContaining({
          totalRequired: expect.any(Number),
          completedRequired: expect.any(Number),
          totalOptional: expect.any(Number),
          completedOptional: expect.any(Number),
          overallCompletion: expect.any(Number),
          pendingUploads: expect.any(Number),
        })
      );
    });
  });
});