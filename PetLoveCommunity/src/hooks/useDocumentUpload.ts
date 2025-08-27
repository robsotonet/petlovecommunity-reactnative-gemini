// Pet Love Community - Document Upload Hook
// Custom React hook for document upload functionality

import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import documentUploadService, { 
  DocumentType, 
  DocumentSource, 
  DocumentUploadOptions,
  DocumentUploadResult,
  CachedDocument,
  UploadProgress 
} from '../services/documentUploadService';
import { useAnalyticsTracker } from './useAnalytics';
import type { RootState } from '../store';

interface UseDocumentUploadProps {
  applicationId: string;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: (result: DocumentUploadResult) => void;
  onUploadError?: (error: string) => void;
}

interface UseDocumentUploadReturn {
  // State
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  documents: CachedDocument[];
  uploadStatus: {
    totalPending: number;
    totalFailed: number;
    isProcessing: boolean;
    oldestPending?: string;
  };
  
  // Actions
  pickDocument: (documentType: DocumentType, options?: Partial<DocumentUploadOptions>) => Promise<DocumentUploadResult>;
  captureDocument: (documentType: DocumentType, options?: Partial<DocumentUploadOptions>) => Promise<DocumentUploadResult>;
  deleteDocument: (documentId: string) => Promise<void>;
  retryFailedUploads: () => Promise<void>;
  
  // Helpers
  getDocumentsByType: (documentType: DocumentType) => CachedDocument[];
  hasRequiredDocuments: () => boolean;
  getMissingRequiredDocuments: () => DocumentType[];
  canAddDocument: (documentType: DocumentType) => boolean;
}

const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.ID,
  DocumentType.PROOF_OF_RESIDENCE,
];

export const useDocumentUpload = (props: UseDocumentUploadProps): UseDocumentUploadReturn => {
  const { applicationId, onUploadProgress, onUploadComplete, onUploadError } = props;
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [documents, setDocuments] = useState<CachedDocument[]>([]);
  
  const { trackUserAction } = useAnalyticsTracker();
  const isOnline = useSelector((state: RootState) => state.pets?.isOnline ?? true);

  // Load documents for this application
  useEffect(() => {
    const loadDocuments = () => {
      const appDocuments = documentUploadService.getDocumentsForApplication(applicationId);
      setDocuments(appDocuments);
    };

    loadDocuments();

    // Set up periodic refresh to catch upload status changes
    const interval = setInterval(loadDocuments, 2000);
    return () => clearInterval(interval);
  }, [applicationId]);

  // Get upload status
  const uploadStatus = documentUploadService.getUploadStatus();

  /**
   * Pick document from device storage
   */
  const pickDocument = useCallback(async (
    documentType: DocumentType, 
    options?: Partial<DocumentUploadOptions>
  ): Promise<DocumentUploadResult> => {
    if (isUploading) {
      return {
        success: false,
        error: 'Another upload is in progress',
        correlationId: '',
      };
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      trackUserAction('document_pick_initiated', {
        applicationId,
        documentType,
        source: DocumentSource.FILES,
      });

      const uploadOptions: DocumentUploadOptions = {
        applicationId,
        documentType,
        source: DocumentSource.FILES,
        ...options,
      };

      const result = await documentUploadService.pickDocument(uploadOptions);

      if (result.success) {
        trackUserAction('document_pick_success', {
          applicationId,
          documentType,
          documentId: result.documentId,
          fileSize: result.fileSize,
        });

        // Refresh documents list
        const updatedDocuments = documentUploadService.getDocumentsForApplication(applicationId);
        setDocuments(updatedDocuments);

        onUploadComplete?.(result);
      } else {
        trackUserAction('document_pick_failed', {
          applicationId,
          documentType,
          error: result.error,
        });

        onUploadError?.(result.error || 'Failed to pick document');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      trackUserAction('document_pick_error', {
        applicationId,
        documentType,
        error: errorMessage,
      });

      onUploadError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
        correlationId: '',
      };
    } finally {
      setIsUploading(false);
    }
  }, [applicationId, isUploading, trackUserAction, onUploadComplete, onUploadError]);

  /**
   * Capture document using camera
   */
  const captureDocument = useCallback(async (
    documentType: DocumentType, 
    options?: Partial<DocumentUploadOptions>
  ): Promise<DocumentUploadResult> => {
    if (isUploading) {
      return {
        success: false,
        error: 'Another upload is in progress',
        correlationId: '',
      };
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      trackUserAction('document_capture_initiated', {
        applicationId,
        documentType,
        source: DocumentSource.CAMERA,
      });

      const uploadOptions: DocumentUploadOptions = {
        applicationId,
        documentType,
        source: DocumentSource.CAMERA,
        ...options,
      };

      const result = await documentUploadService.captureDocument(uploadOptions);

      if (result.success) {
        trackUserAction('document_capture_success', {
          applicationId,
          documentType,
          documentId: result.documentId,
          fileSize: result.fileSize,
        });

        // Refresh documents list
        const updatedDocuments = documentUploadService.getDocumentsForApplication(applicationId);
        setDocuments(updatedDocuments);

        onUploadComplete?.(result);
      } else {
        trackUserAction('document_capture_failed', {
          applicationId,
          documentType,
          error: result.error,
        });

        onUploadError?.(result.error || 'Failed to capture document');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      trackUserAction('document_capture_error', {
        applicationId,
        documentType,
        error: errorMessage,
      });

      onUploadError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
        correlationId: '',
      };
    } finally {
      setIsUploading(false);
    }
  }, [applicationId, isUploading, trackUserAction, onUploadComplete, onUploadError]);

  /**
   * Delete document
   */
  const deleteDocument = useCallback(async (documentId: string): Promise<void> => {
    const document = documentUploadService.getDocument(documentId);
    if (!document) return;

    try {
      trackUserAction('document_delete_initiated', {
        applicationId,
        documentId,
        documentType: document.documentType,
      });

      await documentUploadService.deleteDocument(documentId);

      // Refresh documents list
      const updatedDocuments = documentUploadService.getDocumentsForApplication(applicationId);
      setDocuments(updatedDocuments);

      trackUserAction('document_delete_success', {
        applicationId,
        documentId,
        documentType: document.documentType,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      trackUserAction('document_delete_failed', {
        applicationId,
        documentId,
        error: errorMessage,
      });

      onUploadError?.(errorMessage);
    }
  }, [applicationId, trackUserAction, onUploadError]);

  /**
   * Retry failed uploads
   */
  const retryFailedUploads = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      onUploadError?.('Cannot retry uploads while offline');
      return;
    }

    try {
      trackUserAction('document_retry_uploads', {
        applicationId,
        pendingUploads: uploadStatus.totalPending,
        failedUploads: uploadStatus.totalFailed,
      });

      await documentUploadService.forceSync();

      // Refresh documents list
      const updatedDocuments = documentUploadService.getDocumentsForApplication(applicationId);
      setDocuments(updatedDocuments);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onUploadError?.(errorMessage);
    }
  }, [applicationId, isOnline, uploadStatus, trackUserAction, onUploadError]);

  /**
   * Get documents by type
   */
  const getDocumentsByType = useCallback((documentType: DocumentType): CachedDocument[] => {
    return documents.filter(doc => doc.documentType === documentType);
  }, [documents]);

  /**
   * Check if all required documents are present
   */
  const hasRequiredDocuments = useCallback((): boolean => {
    for (const requiredType of REQUIRED_DOCUMENT_TYPES) {
      const docsOfType = getDocumentsByType(requiredType);
      if (docsOfType.length === 0) {
        return false;
      }
    }
    return true;
  }, [getDocumentsByType]);

  /**
   * Get list of missing required documents
   */
  const getMissingRequiredDocuments = useCallback((): DocumentType[] => {
    const missing: DocumentType[] = [];
    
    for (const requiredType of REQUIRED_DOCUMENT_TYPES) {
      const docsOfType = getDocumentsByType(requiredType);
      if (docsOfType.length === 0) {
        missing.push(requiredType);
      }
    }
    
    return missing;
  }, [getDocumentsByType]);

  /**
   * Check if more documents of a type can be added
   */
  const canAddDocument = useCallback((documentType: DocumentType): boolean => {
    // This would ideally reference the validation rules from the service
    // For now, we'll implement basic logic
    const existingDocs = getDocumentsByType(documentType);
    
    switch (documentType) {
      case DocumentType.ID:
      case DocumentType.PROOF_OF_RESIDENCE:
      case DocumentType.LANDLORD_APPROVAL:
      case DocumentType.INCOME_VERIFICATION:
        return existingDocs.length === 0; // Only one allowed
      case DocumentType.VET_RECORDS:
      case DocumentType.REFERENCES:
      case DocumentType.OTHER:
        return existingDocs.length < 5; // Multiple allowed, but reasonable limit
      default:
        return false;
    }
  }, [getDocumentsByType]);

  return {
    // State
    isUploading,
    uploadProgress,
    documents,
    uploadStatus,
    
    // Actions
    pickDocument,
    captureDocument,
    deleteDocument,
    retryFailedUploads,
    
    // Helpers
    getDocumentsByType,
    hasRequiredDocuments,
    getMissingRequiredDocuments,
    canAddDocument,
  };
};

export default useDocumentUpload;