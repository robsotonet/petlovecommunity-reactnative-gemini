import { TransactionService, generateTransactionId, generateIdempotencyKey } from '../transactionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock console.error to suppress error output during tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('transactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Queue Loading and Initialization', () => {
    it('should load the queue from storage on initialization', async () => {
      const mockQueue = [{ id: 'test-id', payload: {} }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockQueue));
      const service = new TransactionService();
      // Queue loading happens asynchronously in constructor, 
      // getQueue() will await loading completion internally
      const queue = await service.getQueue();
      expect(queue).toEqual(mockQueue);
    });

    it('should handle empty stored queue gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const service = new TransactionService();
      const queue = await service.getQueue();
      expect(queue).toEqual([]);
    });

    it('should handle loadQueue error and initialize empty queue (Lines 29-31)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const service = new TransactionService();
      const queue = await service.getQueue();
      
      // Should initialize empty queue on error
      expect(queue).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to load transaction queue:', expect.any(Error));
    });

    it('should handle corrupted JSON data in storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');
      const service = new TransactionService();
      const queue = await service.getQueue();
      
      // Should initialize empty queue on JSON parse error
      expect(queue).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to load transaction queue:', expect.any(Error));
    });
  });

  describe('Transaction Management Functions', () => {
    it('should call addTransaction method (Lines 43-49)', async () => {
      const service = new TransactionService();
      
      // Ensure service is loaded first
      await service.getQueue();
      
      // Call the addTransaction method - currently a TODO but should not throw
      await expect(service.addTransaction({ test: 'data' })).resolves.not.toThrow();
    });

    it('should call processQueue method (Lines 48-52)', async () => {
      const service = new TransactionService();
      
      // Ensure service is loaded first
      await service.getQueue();
      
      // Call the processQueue method - currently a TODO but should not throw
      await expect(service.processQueue()).resolves.not.toThrow();
    });

    it('should handle multiple concurrent queue operations', async () => {
      const service = new TransactionService();
      
      // Simulate multiple concurrent operations
      const operations = [
        service.getQueue(),
        service.addTransaction({ id: 'test1' }),
        service.processQueue(),
        service.getQueue(),
      ];
      
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique transaction IDs (Line 62)', () => {
      const id1 = generateTransactionId();
      const id2 = generateTransactionId();
      
      expect(id1).toMatch(/^txn_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^txn_\d+_[a-z0-9]+$/);
      expect(id1).not.toEqual(id2);
    });

    it('should generate unique idempotency keys (Line 66)', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      
      expect(key1).toMatch(/^idem_\d+_[a-z0-9]+$/);
      expect(key2).toMatch(/^idem_\d+_[a-z0-9]+$/);
      expect(key1).not.toEqual(key2);
    });

    it('should generate IDs with correct timestamp format', () => {
      const beforeTime = Date.now();
      const transactionId = generateTransactionId();
      const idempotencyKey = generateIdempotencyKey();
      const afterTime = Date.now();
      
      // Extract timestamp from generated IDs
      const txnTimestamp = parseInt(transactionId.split('_')[1]);
      const idemTimestamp = parseInt(idempotencyKey.split('_')[1]);
      
      expect(txnTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(txnTimestamp).toBeLessThanOrEqual(afterTime);
      expect(idemTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(idemTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Service Lifecycle and Async Handling', () => {
    it('should handle multiple service instances correctly', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([{ id: 'shared' }]));
      
      const service1 = new TransactionService();
      const service2 = new TransactionService();
      
      const queue1 = await service1.getQueue();
      const queue2 = await service2.getQueue();
      
      expect(queue1).toEqual(queue2);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2);
    });

    it('should prevent multiple loading attempts', async () => {
      const service = new TransactionService();
      
      // Multiple simultaneous calls to methods that trigger ensureLoaded
      const promises = [
        service.getQueue(),
        service.addTransaction({ test: 1 }),
        service.processQueue(),
        service.getQueue(),
      ];
      
      await Promise.all(promises);
      
      // AsyncStorage.getItem should only be called once per service instance
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });
});
