import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './loggingService';

const PROCESSED_IDS_KEY = '@PetLoveCommunity:ProcessedIds';
const PENDING_OPERATIONS_KEY = '@PetLoveCommunity:PendingOperations';
const ID_EXPIRY_HOURS = 24; // Keep processed IDs for 24 hours

interface ProcessedOperation {
  id: string;
  timestamp: number;
  operation: string;
  context: Record<string, any>;
}

interface PendingOperation {
  id: string;
  operation: string;
  context: Record<string, any>;
  timestamp: number;
  expiresAt: number;
}

class IdempotencyService {
  private processedIds: Map<string, ProcessedOperation> = new Map();
  private pendingOperations: Map<string, PendingOperation> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadPromise = this.initialize();
  }

  /**
   * Initialize the service by loading data and starting cleanup
   */
  private async initialize(): Promise<void> {
    await this.loadProcessedIds();
    await this.loadPendingOperations();
    this.startCleanupInterval();
  }

  private async loadProcessedIds(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      const storedIds = await AsyncStorage.getItem(PROCESSED_IDS_KEY);
      if (storedIds) {
        const operations: ProcessedOperation[] = JSON.parse(storedIds);
        const now = Date.now();
        const expiryTime = ID_EXPIRY_HOURS * 60 * 60 * 1000;
        
        // Filter out expired operations
        const validOperations = operations.filter(op => now - op.timestamp < expiryTime);
        
        this.processedIds = new Map(validOperations.map(op => [op.id, op]));
        
        loggingService.debug('IdempotencyService: Loaded processed IDs', {
          total: operations.length,
          valid: validOperations.length,
          expired: operations.length - validOperations.length,
        });
      }
    } catch (error) {
      loggingService.error('IdempotencyService: Failed to load processed IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.processedIds = new Map();
    }
  }

  /**
   * Load pending operations from storage
   */
  private async loadPendingOperations(): Promise<void> {
    try {
      const storedPending = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      if (storedPending) {
        const operations: PendingOperation[] = JSON.parse(storedPending);
        const now = Date.now();
        
        // Filter out expired pending operations
        const validOperations = operations.filter(op => op.expiresAt > now);
        
        this.pendingOperations = new Map(validOperations.map(op => [op.id, op]));
        
        loggingService.debug('IdempotencyService: Loaded pending operations', {
          total: operations.length,
          valid: validOperations.length,
          expired: operations.length - validOperations.length,
        });
      }
    } catch (error) {
      loggingService.error('IdempotencyService: Failed to load pending operations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.pendingOperations = new Map();
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
    this.isLoaded = true;
  }

  /**
   * Generate a unique idempotency key for an operation
   */
  public async generateKey(operation: string, context: Record<string, any> = {}): Promise<string> {
    await this.ensureLoaded();
    
    // Create a deterministic key based on operation and context
    const contextString = Object.keys(context)
      .sort()
      .map(key => `${key}:${JSON.stringify(context[key])}`)
      .join('|');
    
    const baseKey = `${operation}:${contextString}`;
    const timestamp = Date.now();
    
    // Add timestamp for uniqueness while keeping operation context for deduplication
    const key = `${baseKey}:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    loggingService.debug('IdempotencyService: Generated key', {
      operation,
      context,
      key,
    });
    
    return key;
  }

  /**
   * Check if operation can proceed (not duplicate or too recent)
   */
  public async canProceed(operation: string, context: Record<string, any> = {}): Promise<{
    canProceed: boolean;
    reason?: string;
    existingKey?: string;
  }> {
    await this.ensureLoaded();
    
    const contextString = Object.keys(context)
      .sort()
      .map(key => `${key}:${JSON.stringify(context[key])}`)
      .join('|');
    
    const baseKey = `${operation}:${contextString}`;
    
    // Check for recent pending operations (within 500ms)
    for (const [id, pending] of this.pendingOperations) {
      if (pending.operation === operation) {
        const pendingContextString = Object.keys(pending.context)
          .sort()
          .map(key => `${key}:${JSON.stringify(pending.context[key])}`)
          .join('|');
        
        if (pendingContextString === contextString) {
          const age = Date.now() - pending.timestamp;
          if (age < 500) { // 500ms deduplication window
            return {
              canProceed: false,
              reason: 'Duplicate operation in progress',
              existingKey: id,
            };
          }
        }
      }
    }
    
    // Check for recently completed operations (within 2 seconds)
    for (const [id, processed] of this.processedIds) {
      if (processed.operation === operation) {
        const processedContextString = Object.keys(processed.context)
          .sort()
          .map(key => `${key}:${JSON.stringify(processed.context[key])}`)
          .join('|');
        
        if (processedContextString === contextString) {
          const age = Date.now() - processed.timestamp;
          if (age < 2000) { // 2 second deduplication window for completed ops
            return {
              canProceed: false,
              reason: 'Operation recently completed',
              existingKey: id,
            };
          }
        }
      }
    }
    
    return { canProceed: true };
  }

  /**
   * Mark operation as pending (to prevent duplicates)
   */
  public async markPending(key: string, operation: string, context: Record<string, any> = {}): Promise<void> {
    await this.ensureLoaded();
    
    const pendingOp: PendingOperation = {
      id: key,
      operation,
      context,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // Expire after 5 minutes
    };
    
    this.pendingOperations.set(key, pendingOp);
    await this.savePendingOperations();
    
    loggingService.debug('IdempotencyService: Marked operation as pending', {
      key,
      operation,
      context,
    });
  }

  /**
   * Remove operation from pending list
   */
  public async removePending(key: string): Promise<void> {
    await this.ensureLoaded();
    
    if (this.pendingOperations.delete(key)) {
      await this.savePendingOperations();
      loggingService.debug('IdempotencyService: Removed pending operation', { key });
    }
  }

  public async isProcessed(id: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.processedIds.has(id);
  }

  public async markAsProcessed(id: string, operation?: string, context: Record<string, any> = {}): Promise<void> {
    await this.ensureLoaded();
    
    const processedOp: ProcessedOperation = {
      id,
      timestamp: Date.now(),
      operation: operation || 'unknown',
      context,
    };
    
    this.processedIds.set(id, processedOp);
    
    // Remove from pending if it exists
    this.pendingOperations.delete(id);
    
    await this.saveProcessedIds();
    await this.savePendingOperations();
    
    loggingService.debug('IdempotencyService: Marked operation as processed', {
      id,
      operation,
      context,
    });
  }

  /**
   * Save processed IDs to storage
   */
  private async saveProcessedIds(): Promise<void> {
    try {
      const operations = Array.from(this.processedIds.values());
      await AsyncStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(operations));
    } catch (error) {
      loggingService.error('IdempotencyService: Failed to save processed IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Save pending operations to storage
   */
  private async savePendingOperations(): Promise<void> {
    try {
      const operations = Array.from(this.pendingOperations.values());
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(operations));
    } catch (error) {
      loggingService.error('IdempotencyService: Failed to save pending operations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Start cleanup interval for expired operations
   */
  private startCleanupInterval(): void {
    // Clean up expired operations every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredOperations();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired operations
   */
  private async cleanupExpiredOperations(): Promise<void> {
    const now = Date.now();
    const expiryTime = ID_EXPIRY_HOURS * 60 * 60 * 1000;
    let cleanedCount = 0;

    // Clean expired processed IDs
    const processedBefore = this.processedIds.size;
    for (const [id, operation] of this.processedIds) {
      if (now - operation.timestamp > expiryTime) {
        this.processedIds.delete(id);
        cleanedCount++;
      }
    }

    // Clean expired pending operations
    const pendingBefore = this.pendingOperations.size;
    for (const [id, operation] of this.pendingOperations) {
      if (now > operation.expiresAt) {
        this.pendingOperations.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.saveProcessedIds();
      await this.savePendingOperations();
      
      loggingService.info('IdempotencyService: Cleaned up expired operations', {
        processedRemoved: processedBefore - this.processedIds.size,
        pendingRemoved: pendingBefore - this.pendingOperations.size,
        totalCleaned: cleanedCount,
      });
    }
  }

  /**
   * Get service statistics
   */
  public getStatistics() {
    return {
      processedOperations: this.processedIds.size,
      pendingOperations: this.pendingOperations.size,
      isLoaded: this.isLoaded,
      oldestProcessed: this.processedIds.size > 0 
        ? Math.min(...Array.from(this.processedIds.values()).map(op => op.timestamp))
        : null,
      oldestPending: this.pendingOperations.size > 0
        ? Math.min(...Array.from(this.pendingOperations.values()).map(op => op.timestamp))
        : null,
    };
  }

  /**
   * Force cleanup of expired operations
   */
  public async forceCleanup(): Promise<void> {
    await this.cleanupExpiredOperations();
  }

  /**
   * Destroy the service and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    loggingService.info('IdempotencyService: Service destroyed', {
      processedOperations: this.processedIds.size,
      pendingOperations: this.pendingOperations.size,
    });
  }
}

export { IdempotencyService };

const idempotencyService = new IdempotencyService();
export default idempotencyService;
