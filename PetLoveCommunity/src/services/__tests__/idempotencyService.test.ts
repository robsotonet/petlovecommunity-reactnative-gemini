import { IdempotencyService } from '../idempotencyService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../loggingService', () => ({
  loggingService: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

describe('idempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (service) {
      service.destroy(); // Clean up timers
    }
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should return true if an ID has been processed', async () => {
    const processedOperations = [{
      id: 'test-id',
      timestamp: Date.now(),
      operation: 'test-operation',
      context: {}
    }];
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(processedOperations)) // for processed IDs
      .mockResolvedValueOnce(JSON.stringify([])); // for pending operations
    
    service = new IdempotencyService();
    const isProcessed = await service.isProcessed('test-id');
    expect(isProcessed).toBe(true);
  });

  it('should return false if an ID has not been processed', async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify([])) // for processed IDs
      .mockResolvedValueOnce(JSON.stringify([])); // for pending operations
    service = new IdempotencyService();
    const isProcessed = await service.isProcessed('test-id');
    expect(isProcessed).toBe(false);
  });

  it('should mark an ID as processed', async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValue(JSON.stringify([])); // for both processed and pending operations
    service = new IdempotencyService();
    await service.markAsProcessed('test-id', 'test-operation', { context: 'test' });
    const isProcessed = await service.isProcessed('test-id');
    expect(isProcessed).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@PetLoveCommunity:ProcessedIds', expect.stringContaining('test-id'));
  });
});
