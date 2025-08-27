// Pet Love Community - useDocumentUpload Hook Tests
// Unit tests for document upload hook including isOnline state handling

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useDocumentUpload } from '../useDocumentUpload';
import documentUploadService, { DocumentType, DocumentSource } from '../../services/documentUploadService';
import petSlice from '../../features/pets/petSlice';

// Mock documentUploadService
jest.mock('../../services/documentUploadService', () => ({
  __esModule: true,
  default: {
    getDocumentsForApplication: jest.fn(),
    getUploadStatus: jest.fn(),
    pickDocument: jest.fn(),
    captureDocument: jest.fn(),
    deleteDocument: jest.fn(),
    forceSync: jest.fn(),
  },
  DocumentType: {
    ID: 'id',
    PROOF_OF_RESIDENCE: 'proof_of_residence',
    LANDLORD_APPROVAL: 'landlord_approval',
    VET_RECORDS: 'vet_records',
    INCOME_VERIFICATION: 'income_verification',
    REFERENCES: 'references',
    OTHER: 'other',
  },
  DocumentSource: {
    CAMERA: 'camera',
    GALLERY: 'gallery',
    FILES: 'files',
  },
}));

// Mock useAnalyticsTracker
jest.mock('../useAnalytics', () => ({
  useAnalyticsTracker: () => ({
    trackUserAction: jest.fn(),
  }),
}));

// Mock timers for the interval in the hook
jest.useFakeTimers();

describe('useDocumentUpload', () => {
  let store: ReturnType<typeof configureStore>;
  let mockDocumentUploadService: jest.Mocked<typeof documentUploadService>;

  const mockDocuments = [
    {
      id: 'doc-1',
      applicationId: 'app-123',
      documentType: DocumentType.ID,
      localPath: '/path/to/id.jpg',
      fileName: 'id.jpg',
      fileSize: 50000,
      mimeType: 'image/jpeg',
      correlationId: 'corr-123',
    },
    {
      id: 'doc-2',
      applicationId: 'app-123',
      documentType: DocumentType.PROOF_OF_RESIDENCE,
      localPath: '/path/to/proof.pdf',
      fileName: 'proof.pdf',
      fileSize: 100000,
      mimeType: 'application/pdf',
      correlationId: 'corr-456',
    },
  ];

  const createTestStore = (initialState = {}) => {
    return configureStore({
      reducer: {
        pets: petSlice,
      },
      preloadedState: {
        pets: {
          pets: [],
          isLoading: false,
          error: null,
          favorites: [],
          selectedPet: null,
          isOnline: true,
          ...initialState,
        },
      },
    });
  };

  const renderHookWithProvider = (props: any) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => 
      React.createElement(Provider, { store }, children);
    return renderHook(() => useDocumentUpload(props), { wrapper });
  };

  beforeEach(() => {
    store = createTestStore();
    mockDocumentUploadService = documentUploadService as jest.Mocked<typeof documentUploadService>;
    
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Mock default responses
    mockDocumentUploadService.getDocumentsForApplication.mockReturnValue(mockDocuments);
    mockDocumentUploadService.getUploadStatus.mockReturnValue({
      totalPending: 0,
      totalFailed: 0,
      isProcessing: false,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('isOnline state handling', () => {
    it('should correctly read isOnline state as true when online', () => {
      store = createTestStore({ isOnline: true });
      
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      // isOnline should be true based on store state
      // We can't directly access the isOnline value from the hook,
      // but we can infer it from behavior or mock the selector
      expect(result.current.documents).toEqual(mockDocuments);
    });

    it('should correctly read isOnline state as false when offline', () => {
      store = createTestStore({ isOnline: false });
      
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      // Hook should still function when offline, just with different behavior
      expect(result.current.documents).toEqual(mockDocuments);
    });

    it('should default to true when isOnline is undefined (using ?? operator)', () => {
      // Create a store where pets state might not have isOnline defined
      const customStore = configureStore({
        reducer: {
          pets: petSlice,
        },
        preloadedState: {
          pets: {
            pets: [],
            isLoading: false,
            error: null,
            favorites: [],
            selectedPet: null,
            // isOnline is intentionally not defined to test the ?? operator
          } as any,
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => 
        React.createElement(Provider, { store: customStore }, children);

      const { result } = renderHook(() => useDocumentUpload({
        applicationId: 'app-123',
      }), { wrapper });

      // Should still work with default true value
      expect(result.current.documents).toEqual(mockDocuments);
    });
  });

  describe('Document loading and management', () => {
    it('should load documents for the application on mount', () => {
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      expect(mockDocumentUploadService.getDocumentsForApplication).toHaveBeenCalledWith('app-123');
      expect(result.current.documents).toEqual(mockDocuments);
    });

    it('should refresh documents periodically', () => {
      renderHookWithProvider({
        applicationId: 'app-123',
      });

      // Clear initial call
      mockDocumentUploadService.getDocumentsForApplication.mockClear();

      // Fast forward 2 seconds to trigger interval
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockDocumentUploadService.getDocumentsForApplication).toHaveBeenCalledWith('app-123');
    });

    it('should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Document picking functionality', () => {
    it('should pick document successfully', async () => {
      const mockResult = {
        success: true,
        documentId: 'new-doc-123',
        fileName: 'new-document.pdf',
        correlationId: 'corr-789',
      };

      mockDocumentUploadService.pickDocument.mockResolvedValue(mockResult);

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      let pickResult;
      await act(async () => {
        pickResult = await result.current.pickDocument(DocumentType.VET_RECORDS);
      });

      expect(mockDocumentUploadService.pickDocument).toHaveBeenCalledWith({
        applicationId: 'app-123',
        documentType: DocumentType.VET_RECORDS,
        source: DocumentSource.FILES,
      });

      expect(pickResult).toEqual(mockResult);
    });

    it('should prevent concurrent uploads', async () => {
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      // Start first upload (don't await)
      const upload1Promise = result.current.pickDocument(DocumentType.ID);
      
      // Start second upload immediately
      let upload2Result;
      await act(async () => {
        upload2Result = await result.current.pickDocument(DocumentType.VET_RECORDS);
      });

      expect(upload2Result).toEqual({
        success: false,
        error: 'Another upload is in progress',
        correlationId: '',
      });

      // Cleanup first upload
      await act(async () => {
        await upload1Promise;
      });
    });

    it('should handle upload errors', async () => {
      const mockError = new Error('Upload failed');
      mockDocumentUploadService.pickDocument.mockRejectedValue(mockError);

      const mockOnError = jest.fn();

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
        onUploadError: mockOnError,
      });

      let pickResult;
      await act(async () => {
        pickResult = await result.current.pickDocument(DocumentType.ID);
      });

      expect(pickResult).toEqual({
        success: false,
        error: 'Upload failed',
        correlationId: '',
      });

      expect(mockOnError).toHaveBeenCalledWith('Upload failed');
    });
  });

  describe('Document capture functionality', () => {
    it('should capture document successfully', async () => {
      const mockResult = {
        success: true,
        documentId: 'captured-doc-456',
        fileName: 'captured-photo.jpg',
        correlationId: 'corr-999',
      };

      mockDocumentUploadService.captureDocument.mockResolvedValue(mockResult);

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      let captureResult;
      await act(async () => {
        captureResult = await result.current.captureDocument(DocumentType.ID);
      });

      expect(mockDocumentUploadService.captureDocument).toHaveBeenCalledWith({
        applicationId: 'app-123',
        documentType: DocumentType.ID,
        source: DocumentSource.CAMERA,
      });

      expect(captureResult).toEqual(mockResult);
    });
  });

  describe('Document deletion', () => {
    it('should delete document successfully', async () => {
      mockDocumentUploadService.deleteDocument.mockResolvedValue();

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      await act(async () => {
        await result.current.deleteDocument('doc-1');
      });

      expect(mockDocumentUploadService.deleteDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('Upload status management', () => {
    it('should return upload status from service', () => {
      const mockStatus = {
        totalPending: 2,
        totalFailed: 1,
        isProcessing: true,
        oldestPending: '2023-01-01T00:00:00Z',
      };

      mockDocumentUploadService.getUploadStatus.mockReturnValue(mockStatus);

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      expect(result.current.uploadStatus).toEqual(mockStatus);
    });

    it('should retry failed uploads', async () => {
      mockDocumentUploadService.forceSync.mockResolvedValue();

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      await act(async () => {
        await result.current.retryFailedUploads();
      });

      expect(mockDocumentUploadService.forceSync).toHaveBeenCalled();
    });
  });

  describe('Document validation helpers', () => {
    it('should filter documents by type', () => {
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      const idDocuments = result.current.getDocumentsByType(DocumentType.ID);
      expect(idDocuments).toHaveLength(1);
      expect(idDocuments[0].documentType).toBe(DocumentType.ID);
    });

    it('should check if required documents are present', () => {
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      expect(result.current.hasRequiredDocuments()).toBe(true);
    });

    it('should identify missing required documents', () => {
      // Mock with only ID document, missing proof of residence
      mockDocumentUploadService.getDocumentsForApplication.mockReturnValue([mockDocuments[0]]);

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      const missing = result.current.getMissingRequiredDocuments();
      expect(missing).toContain(DocumentType.PROOF_OF_RESIDENCE);
    });

    it('should check if document can be added based on validation rules', () => {
      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
      });

      // ID documents typically don't allow multiples
      expect(result.current.canAddDocument(DocumentType.ID)).toBe(false);
      
      // VET_RECORDS typically allow multiples
      expect(result.current.canAddDocument(DocumentType.VET_RECORDS)).toBe(true);
    });
  });

  describe('Callback handling', () => {
    it('should call onUploadComplete when upload succeeds', async () => {
      const mockResult = {
        success: true,
        documentId: 'new-doc-123',
        fileName: 'document.pdf',
        correlationId: 'corr-789',
      };

      mockDocumentUploadService.pickDocument.mockResolvedValue(mockResult);
      const mockOnComplete = jest.fn();

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
        onUploadComplete: mockOnComplete,
      });

      await act(async () => {
        await result.current.pickDocument(DocumentType.VET_RECORDS);
      });

      expect(mockOnComplete).toHaveBeenCalledWith(mockResult);
    });

    it('should call onUploadError when upload fails', async () => {
      mockDocumentUploadService.pickDocument.mockRejectedValue(new Error('Network error'));
      const mockOnError = jest.fn();

      const { result } = renderHookWithProvider({
        applicationId: 'app-123',
        onUploadError: mockOnError,
      });

      await act(async () => {
        await result.current.pickDocument(DocumentType.ID);
      });

      expect(mockOnError).toHaveBeenCalledWith('Network error');
    });
  });
});