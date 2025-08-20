import { TransactionService } from '../transactionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('transactionService', () => {
  it('should load the queue from storage on initialization', async () => {
    const mockQueue = [{ id: 'test-id', payload: {} }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockQueue));
    const service = new TransactionService();
    await service.loadQueue();
    expect(service.getQueue()).toEqual(mockQueue);
  });
});
