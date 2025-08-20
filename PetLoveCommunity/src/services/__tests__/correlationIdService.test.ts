import correlationIdService from '../correlationIdService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(),
}));

describe('correlationIdService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a stored correlation ID', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-id');
    const id = await correlationIdService.getCorrelationId();
    expect(id).toBe('test-id');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('CORRELATION_ID');
  });

  it('should generate a new correlation ID if none is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (uuid.v4 as jest.Mock).mockReturnValue('new-id');
    const id = await correlationIdService.getCorrelationId();
    expect(id).toBe('new-id');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('CORRELATION_ID', 'new-id');
  });
});
