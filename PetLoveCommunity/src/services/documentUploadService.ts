// Pet Love Community - Document Upload Service
// Enterprise document upload handling with validation, security, and correlation tracking

import { Platform, PermissionsAndroid } from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import correlationIdService from './correlationIdService';
import { idempotencyService } from './idempotencyService';
import { loggingService } from './loggingService';
import deviceInfoService from './deviceInfoService';
import { petApi } from './petApi';
import { store } from '../store';

// Storage keys
const DOCUMENT_CACHE_KEY = '@PetLoveCommunity:DocumentCache';
const UPLOAD_QUEUE_KEY = '@PetLoveCommunity:DocumentUploadQueue';

// Document types and validation
export enum DocumentType {
  ID = 'id',
  PROOF_OF_RESIDENCE = 'proof_of_residence',
  LANDLORD_APPROVAL = 'landlord_approval',
  VET_RECORDS = 'vet_records',
  INCOME_VERIFICATION = 'income_verification',
  REFERENCES = 'references',
  OTHER = 'other',
}

export enum DocumentSource {
  CAMERA = 'camera',
  GALLERY = 'gallery',
  FILES = 'files',
}

export interface DocumentValidationRules {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  requiredForApplication: boolean;
  allowMultiple: boolean;
  compressionQuality?: number;
  maxDimensions?: { width: number; height: number };
}

export interface DocumentUploadOptions {
  applicationId: string;
  documentType: DocumentType;
  source: DocumentSource;
  fileName?: string;
  description?: string;
  replaceExisting?: boolean;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  url?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  correlationId: string;
  validationWarnings?: string[];
}

export interface UploadProgress {
  documentId: string;
  loaded: number;
  total: number;
  percentage: number;
  stage: 'validating' | 'processing' | 'uploading' | 'completing';
}

export interface CachedDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  localPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt?: string;
  serverUrl?: string;
  thumbnailPath?: string;
  correlationId: string;
}

export interface QueuedUpload {
  id: string;
  document: CachedDocument;
  options: DocumentUploadOptions;
  retryCount: number;
  createdAt: string;
  lastAttempt?: string;
}

class DocumentUploadService {
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly MAX_UPLOAD_RETRIES = 3;
  private static readonly COMPRESSION_QUALITY = 0.8;

  private uploadQueue: QueuedUpload[] = [];
  private documentCache: CachedDocument[] = [];
  private isProcessingQueue = false;

  // Document validation rules by type
  private static readonly VALIDATION_RULES: Record<DocumentType, DocumentValidationRules> = {
    [DocumentType.ID]: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: true,
      allowMultiple: false,
      compressionQuality: 0.9,
      maxDimensions: { width: 2048, height: 2048 },
    },
    [DocumentType.PROOF_OF_RESIDENCE]: {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: true,
      allowMultiple: false,
      compressionQuality: 0.8,
      maxDimensions: { width: 2048, height: 2048 },
    },
    [DocumentType.LANDLORD_APPROVAL]: {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: false,
      allowMultiple: false,
      compressionQuality: 0.8,
      maxDimensions: { width: 2048, height: 2048 },
    },
    [DocumentType.VET_RECORDS]: {
      maxSizeBytes: 15 * 1024 * 1024, // 15MB for potentially multiple pages
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: false,
      allowMultiple: true,
      compressionQuality: 0.8,
      maxDimensions: { width: 2048, height: 2048 },
    },
    [DocumentType.INCOME_VERIFICATION]: {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: false,
      allowMultiple: false,
      compressionQuality: 0.8,
      maxDimensions: { width: 2048, height: 2048 },
    },
    [DocumentType.REFERENCES]: {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: false,
      allowMultiple: true,
      compressionQuality: 0.8,
      maxDimensions: { width: 2048, height: 2048 },
    },
    [DocumentType.OTHER]: {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      requiredForApplication: false,
      allowMultiple: true,
      compressionQuality: 0.7,
      maxDimensions: { width: 1920, height: 1920 },
    },
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the document upload service
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadDocumentCache();
      await this.loadUploadQueue();
      
      loggingService.info('DocumentUploadService: Initialized', {
        cacheSize: this.documentCache.length,
        queueSize: this.uploadQueue.length,
      });
    } catch (error) {
      loggingService.error('DocumentUploadService: Failed to initialize', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Pick document from device storage
   */
  public async pickDocument(
    options: Omit<DocumentUploadOptions, 'source'>
  ): Promise<DocumentUploadResult> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      // Request storage permissions
      const permissionResult = await this.requestStoragePermissions();
      if (!permissionResult) {
        return {
          success: false,
          error: 'Storage permission denied',
          correlationId,
        };
      }

      const rules = DocumentUploadService.VALIDATION_RULES[options.documentType];
      const allowMultiple = rules.allowMultiple && !options.replaceExisting;

      const results = await DocumentPicker.pick({
        type: this.getMimeTypesForPicker(rules.allowedMimeTypes),
        allowMultiSelection: allowMultiple,
        copyTo: 'documentDirectory',
      });

      if (results.length === 0) {
        return {
          success: false,
          error: 'No document selected',
          correlationId,
        };
      }

      // Process the first document (or only document for single selection)
      const document = results[0];
      return await this.processSelectedDocument(
        document,
        { ...options, source: DocumentSource.FILES },
        correlationId
      );

    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return {
          success: false,
          error: 'Document selection cancelled',
          correlationId,
        };
      }

      loggingService.error('DocumentUploadService: Failed to pick document', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pick document',
        correlationId,
      };
    }
  }

  /**
   * Capture document using camera
   */
  public async captureDocument(
    options: Omit<DocumentUploadOptions, 'source'>
  ): Promise<DocumentUploadResult> {
    const correlationId = await correlationIdService.getCorrelationId();

    try {
      // Request camera permissions
      const permissionResult = await this.requestCameraPermissions();
      if (!permissionResult) {
        return {
          success: false,
          error: 'Camera permission denied',
          correlationId,
        };
      }

      const result = await new Promise<ImagePickerResponse>((resolve, reject) => {
        launchCamera(
          {
            mediaType: 'photo' as MediaType,
            quality: 0.9,
            maxWidth: 2048,
            maxHeight: 2048,
            includeBase64: false,
            saveToPhotos: false,
          },
          (response) => {
            if (response.errorMessage) {
              reject(new Error(response.errorMessage));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'Camera capture cancelled',
          correlationId,
        };
      }

      const asset = result.assets[0];
      const documentResponse: DocumentPickerResponse = {
        uri: asset.uri!,
        name: asset.fileName || `document_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize || 0,
        fileCopyUri: asset.uri!,
      };

      return await this.processSelectedDocument(
        documentResponse,
        { ...options, source: DocumentSource.CAMERA },
        correlationId
      );

    } catch (error) {
      loggingService.error('DocumentUploadService: Failed to capture document', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture document',
        correlationId,
      };
    }
  }

  /**
   * Process selected document
   */
  private async processSelectedDocument(
    document: DocumentPickerResponse,
    options: DocumentUploadOptions,
    correlationId: string
  ): Promise<DocumentUploadResult> {
    try {
      // Validate document
      const validationResult = await this.validateDocument(document, options.documentType);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          correlationId,
          validationWarnings: validationResult.warnings,
        };
      }

      // Create document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process and cache document
      const processedPath = await this.processDocument(document, documentId, options.documentType);

      const cachedDocument: CachedDocument = {
        id: documentId,
        applicationId: options.applicationId,
        documentType: options.documentType,
        localPath: processedPath,
        fileName: document.name || 'unknown',
        fileSize: document.size || 0,
        mimeType: document.type || 'application/octet-stream',
        correlationId,
      };

      // Add to cache
      await this.addToCache(cachedDocument);

      // Queue for upload
      await this.queueForUpload(cachedDocument, options);

      loggingService.info('DocumentUploadService: Document processed and queued', {
        correlationId,
        documentId,
        documentType: options.documentType,
        fileSize: cachedDocument.fileSize,
      });

      return {
        success: true,
        documentId,
        fileName: cachedDocument.fileName,
        fileSize: cachedDocument.fileSize,
        mimeType: cachedDocument.mimeType,
        correlationId,
        validationWarnings: validationResult.warnings,
      };

    } catch (error) {
      loggingService.error('DocumentUploadService: Failed to process document', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process document',
        correlationId,
      };
    }
  }

  /**
   * Validate document against rules
   */
  private async validateDocument(
    document: DocumentPickerResponse,
    documentType: DocumentType
  ): Promise<{ isValid: boolean; error?: string; warnings?: string[] }> {
    const rules = DocumentUploadService.VALIDATION_RULES[documentType];
    const warnings: string[] = [];

    // Check file size
    if (document.size && document.size > rules.maxSizeBytes) {
      return {
        isValid: false,
        error: `File size ${this.formatFileSize(document.size)} exceeds maximum allowed ${this.formatFileSize(rules.maxSizeBytes)}`,
      };
    }

    // Check MIME type
    if (document.type && !rules.allowedMimeTypes.includes(document.type)) {
      return {
        isValid: false,
        error: `File type ${document.type} is not supported for ${documentType}`,
      };
    }

    // Add warnings for optimization opportunities
    if (document.size && document.size > rules.maxSizeBytes * 0.8) {
      warnings.push('Large file size may result in slower upload times');
    }

    if (document.type && document.type === 'image/png' && documentType !== DocumentType.ID) {
      warnings.push('JPEG format may provide better compression for documents');
    }

    return { isValid: true, warnings };
  }

  /**
   * Process document (resize, compress, optimize)
   */
  private async processDocument(
    document: DocumentPickerResponse,
    documentId: string,
    documentType: DocumentType
  ): Promise<string> {
    const rules = DocumentUploadService.VALIDATION_RULES[documentType];
    const isImage = document.type?.startsWith('image/');

    if (!isImage || !document.uri) {
      // For non-images, just copy to cache directory
      const cachePath = `${RNFS.DocumentDirectoryPath}/documents/${documentId}_${document.name}`;
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/documents`);
      await RNFS.copyFile(document.fileCopyUri || document.uri, cachePath);
      return cachePath;
    }

    // Process image documents
    const maxDimensions = rules.maxDimensions || { width: 2048, height: 2048 };
    const quality = (rules.compressionQuality || DocumentUploadService.COMPRESSION_QUALITY) * 100;

    try {
      const resizedImage = await ImageResizer.createResizedImage(
        document.uri,
        maxDimensions.width,
        maxDimensions.height,
        'JPEG',
        quality,
        0,
        `${RNFS.DocumentDirectoryPath}/documents`,
        false,
        { mode: 'contain', onlyScaleDown: true }
      );

      // Rename to include document ID
      const finalPath = `${RNFS.DocumentDirectoryPath}/documents/${documentId}_${document.name?.replace(/\.[^/.]+$/, '.jpg')}`;
      await RNFS.moveFile(resizedImage.path, finalPath);

      return finalPath;
    } catch (error) {
      // Fallback: just copy the original file
      const fallbackPath = `${RNFS.DocumentDirectoryPath}/documents/${documentId}_${document.name}`;
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/documents`);
      await RNFS.copyFile(document.fileCopyUri || document.uri, fallbackPath);
      return fallbackPath;
    }
  }

  /**
   * Add document to cache
   */
  private async addToCache(document: CachedDocument): Promise<void> {
    // Remove existing document of same type for same application if not allowing multiples
    const rules = DocumentUploadService.VALIDATION_RULES[document.documentType];
    if (!rules.allowMultiple) {
      this.documentCache = this.documentCache.filter(
        cached => !(cached.applicationId === document.applicationId && 
                   cached.documentType === document.documentType)
      );
    }

    this.documentCache.push(document);
    await this.manageCacheSize();
    await this.saveDocumentCache();
  }

  /**
   * Queue document for upload
   */
  private async queueForUpload(document: CachedDocument, options: DocumentUploadOptions): Promise<void> {
    const queuedUpload: QueuedUpload = {
      id: `upload_${document.id}`,
      document,
      options,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.uploadQueue.push(queuedUpload);
    await this.saveUploadQueue();

    // Process queue if online
    if (store.getState().pets?.isOnline !== false) {
      this.processUploadQueue();
    }
  }

  /**
   * Process upload queue
   */
  private async processUploadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) return;

    this.isProcessingQueue = true;
    const correlationId = await correlationIdService.getCorrelationId();

    loggingService.info('DocumentUploadService: Processing upload queue', {
      correlationId,
      queueSize: this.uploadQueue.length,
    });

    const pendingUploads = [...this.uploadQueue];
    
    for (const upload of pendingUploads) {
      try {
        const result = await this.uploadDocument(upload);
        
        if (result.success) {
          // Update cached document with server info
          const cachedDoc = this.documentCache.find(doc => doc.id === upload.document.id);
          if (cachedDoc) {
            cachedDoc.serverUrl = result.url;
            cachedDoc.uploadedAt = new Date().toISOString();
          }
          
          // Remove from queue
          this.uploadQueue = this.uploadQueue.filter(q => q.id !== upload.id);
        } else {
          // Increment retry count
          upload.retryCount++;
          upload.lastAttempt = new Date().toISOString();
          
          if (upload.retryCount >= DocumentUploadService.MAX_UPLOAD_RETRIES) {
            loggingService.error('DocumentUploadService: Upload failed after max retries', {
              correlationId,
              uploadId: upload.id,
              error: result.error,
            });
            
            // Remove from queue
            this.uploadQueue = this.uploadQueue.filter(q => q.id !== upload.id);
          }
        }
      } catch (error) {
        loggingService.error('DocumentUploadService: Upload processing error', {
          correlationId,
          uploadId: upload.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.saveDocumentCache();
    await this.saveUploadQueue();
    this.isProcessingQueue = false;
  }

  /**
   * Upload document to server
   */
  private async uploadDocument(upload: QueuedUpload): Promise<DocumentUploadResult> {
    const correlationId = await correlationIdService.getCorrelationId();
    const idempotencyKey = await idempotencyService.generateKey('document_upload', {
      documentId: upload.document.id,
      applicationId: upload.options.applicationId,
    });

    try {
      // Read file data
      const fileExists = await RNFS.exists(upload.document.localPath);
      if (!fileExists) {
        throw new Error('Document file not found on device');
      }

      const fileData = await RNFS.readFile(upload.document.localPath, 'base64');
      
      const uploadData = {
        applicationId: upload.options.applicationId,
        documentType: upload.document.documentType,
        fileName: upload.document.fileName,
        fileSize: upload.document.fileSize,
        mimeType: upload.document.mimeType,
        description: upload.options.description,
        fileData,
      };

      const result = await store.dispatch(
        petApi.endpoints.uploadApplicationDocument.initiate(uploadData, {
          fixedCacheKey: idempotencyKey,
        })
      ).unwrap();

      if (result.success) {
        return {
          success: true,
          documentId: upload.document.id,
          url: result.data.url,
          thumbnailUrl: result.data.thumbnailUrl,
          correlationId,
        };
      } else {
        throw new Error(result.message || 'Upload failed');
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        correlationId,
      };
    }
  }

  /**
   * Get documents for application
   */
  public getDocumentsForApplication(applicationId: string): CachedDocument[] {
    return this.documentCache.filter(doc => doc.applicationId === applicationId);
  }

  /**
   * Get document by ID
   */
  public getDocument(documentId: string): CachedDocument | null {
    return this.documentCache.find(doc => doc.id === documentId) || null;
  }

  /**
   * Delete document
   */
  public async deleteDocument(documentId: string): Promise<void> {
    const document = this.getDocument(documentId);
    if (!document) return;

    try {
      // Delete local file
      const fileExists = await RNFS.exists(document.localPath);
      if (fileExists) {
        await RNFS.unlink(document.localPath);
      }

      // Remove from cache
      this.documentCache = this.documentCache.filter(doc => doc.id !== documentId);
      
      // Remove from upload queue if present
      this.uploadQueue = this.uploadQueue.filter(upload => upload.document.id !== documentId);

      await this.saveDocumentCache();
      await this.saveUploadQueue();

      loggingService.info('DocumentUploadService: Document deleted', {
        documentId,
        applicationId: document.applicationId,
      });

    } catch (error) {
      loggingService.error('DocumentUploadService: Failed to delete document', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get upload queue status
   */
  public getUploadStatus(): {
    totalPending: number;
    totalFailed: number;
    isProcessing: boolean;
    oldestPending?: string;
  } {
    const failed = this.uploadQueue.filter(upload => upload.retryCount >= DocumentUploadService.MAX_UPLOAD_RETRIES);
    const pending = this.uploadQueue.filter(upload => upload.retryCount < DocumentUploadService.MAX_UPLOAD_RETRIES);
    
    return {
      totalPending: pending.length,
      totalFailed: failed.length,
      isProcessing: this.isProcessingQueue,
      oldestPending: pending.length > 0 ? pending[0].createdAt : undefined,
    };
  }

  /**
   * Force process upload queue
   */
  public async forceSync(): Promise<void> {
    if (!this.isProcessingQueue) {
      await this.processUploadQueue();
    }
  }

  /**
   * Request camera permissions
   */
  private async requestCameraPermissions(): Promise<boolean> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      return false;
    }
  }

  /**
   * Request storage permissions
   */
  private async requestStoragePermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // iOS doesn't require explicit storage permission for document picker
    } catch (error) {
      return false;
    }
  }

  /**
   * Get MIME types for document picker
   */
  private getMimeTypesForPicker(mimeTypes: string[]): string[] {
    // Document picker expects specific types
    const typeMap: Record<string, string[]> = {
      'image/jpeg': ['image/jpeg'],
      'image/png': ['image/png'],
      'application/pdf': ['application/pdf'],
    };

    return mimeTypes.flatMap(type => typeMap[type] || [type]);
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Manage cache size
   */
  private async manageCacheSize(): Promise<void> {
    let totalSize = 0;
    const sizeSortedDocs = [...this.documentCache].sort((a, b) => 
      new Date(a.correlationId).getTime() - new Date(b.correlationId).getTime()
    );

    for (const doc of sizeSortedDocs) {
      totalSize += doc.fileSize;
    }

    while (totalSize > DocumentUploadService.MAX_CACHE_SIZE && sizeSortedDocs.length > 0) {
      const oldestDoc = sizeSortedDocs.shift()!;
      
      try {
        const fileExists = await RNFS.exists(oldestDoc.localPath);
        if (fileExists) {
          await RNFS.unlink(oldestDoc.localPath);
        }
      } catch (error) {
        loggingService.warn('DocumentUploadService: Failed to cleanup cached file', {
          documentId: oldestDoc.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      this.documentCache = this.documentCache.filter(doc => doc.id !== oldestDoc.id);
      totalSize -= oldestDoc.fileSize;
    }
  }

  /**
   * Load document cache from storage
   */
  private async loadDocumentCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(DOCUMENT_CACHE_KEY);
      if (cached) {
        this.documentCache = JSON.parse(cached);
      }
    } catch (error) {
      loggingService.warn('DocumentUploadService: Failed to load document cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.documentCache = [];
    }
  }

  /**
   * Save document cache to storage
   */
  private async saveDocumentCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(DOCUMENT_CACHE_KEY, JSON.stringify(this.documentCache));
    } catch (error) {
      loggingService.warn('DocumentUploadService: Failed to save document cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Load upload queue from storage
   */
  private async loadUploadQueue(): Promise<void> {
    try {
      const queue = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
      if (queue) {
        this.uploadQueue = JSON.parse(queue);
      }
    } catch (error) {
      loggingService.warn('DocumentUploadService: Failed to load upload queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.uploadQueue = [];
    }
  }

  /**
   * Save upload queue to storage
   */
  private async saveUploadQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(this.uploadQueue));
    } catch (error) {
      loggingService.warn('DocumentUploadService: Failed to save upload queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get service statistics
   */
  public getStatistics() {
    const uploadStatus = this.getUploadStatus();
    
    const documentsByType = this.documentCache.reduce((acc, doc) => {
      acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
      return acc;
    }, {} as Record<DocumentType, number>);

    const totalCacheSize = this.documentCache.reduce((sum, doc) => sum + doc.fileSize, 0);
    
    return {
      totalCachedDocuments: this.documentCache.length,
      totalCacheSize,
      documentsByType,
      uploadStatus,
      cacheUtilization: (totalCacheSize / DocumentUploadService.MAX_CACHE_SIZE) * 100,
    };
  }

  /**
   * Cleanup service resources
   */
  public destroy(): void {
    this.isProcessingQueue = false;
    this.documentCache = [];
    this.uploadQueue = [];
    
    loggingService.info('DocumentUploadService: Service destroyed');
  }
}

// Export singleton instance
export const documentUploadService = new DocumentUploadService();
export default documentUploadService;