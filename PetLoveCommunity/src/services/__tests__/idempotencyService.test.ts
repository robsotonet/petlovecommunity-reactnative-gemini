import { IdempotencyService } from '../idempotencyService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('idempotencyService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true if an ID has been processed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['test-id']));
    const service = new IdempotencyService();
    const isProcessed = await service.isProcessed('test-id');
    expect(isProcessed).toBe(true);
  });

  it('should return false if an ID has not been processed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    const service = new IdempotencyService();
    const isProcessed = await service.isProcessed('test-id');
    expect(isProcessed).toBe(false);
  });

  it('should mark an ID as processed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    const service = new IdempotencyService();
    await service.markAsProcessed('test-id');
    const isProcessed = await service.isProcessed('test-id');
    expect(isProcessed).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('PROCESSED_IDS', JSON.stringify(['test-id']));
  });
});
