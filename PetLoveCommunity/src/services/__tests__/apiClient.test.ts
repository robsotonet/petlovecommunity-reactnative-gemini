// ApiClient Integration Tests
// Testing enterprise headers, correlation IDs, and HTTP methods

import apiClient, { baseQueryWithEnterpriseHeaders } from '../apiClient';
import correlationIdService from '../correlationIdService';
import { generateTransactionId, generateIdempotencyKey } from '../../transactions/transactionService';

// Mock dependencies
jest.mock('../correlationIdService');
jest.mock('../../transactions/transactionService');
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => Promise.resolve('test-device-123')),
  getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../../config/constants', () => ({
  API_CONFIG: {
    BASE_URL: 'https://test-api.petlove.com',
    TIMEOUT: 10000,
  },
  ENV: {
    IS_DEV: false, // Disable console logs for tests
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockCorrelationIdService = correlationIdService as jest.Mocked<typeof correlationIdService>;
const mockGenerateTransactionId = generateTransactionId as jest.MockedFunction<typeof generateTransactionId>;
const mockGenerateIdempotencyKey = generateIdempotencyKey as jest.MockedFunction<typeof generateIdempotencyKey>;

describe('ApiClient Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCorrelationIdService.getCorrelationId.mockResolvedValue('test-correlation-123');
    mockGenerateTransactionId.mockReturnValue('test-transaction-456');
    mockGenerateIdempotencyKey.mockReturnValue('test-idempotency-789');
    
    mockFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true }),
      text: jest.fn().mockResolvedValue('{"success":true}'),
      clone: jest.fn().mockReturnThis(),
      status: 200,
      ok: true,
      headers: new Map(),
    });
  });

  describe('Enterprise Headers Integration', () => {
    test('should include all required enterprise headers in GET requests', async () => {
      await apiClient.get('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-123',
            'X-Transaction-ID': 'test-transaction-456',
            'X-Device-ID': 'test-device-123',
            'X-Platform': 'ios',
            'X-App-Version': '1.0.0',
            'Content-Type': 'application/json',
          }),
        })
      );

      // GET requests should NOT have idempotency key
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['X-Idempotency-Key']).toBeUndefined();
    });

    test('should include idempotency key in POST requests', async () => {
      const testData = { name: 'Test Pet', breed: 'Golden Retriever' };
      
      await apiClient.post('/pets', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-123',
            'X-Transaction-ID': 'test-transaction-456',
            'X-Device-ID': 'test-device-123',
            'X-Platform': 'ios',
            'X-App-Version': '1.0.0',
            'X-Idempotency-Key': 'test-idempotency-789',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(testData),
        })
      );
    });

    test('should include idempotency key in PUT requests', async () => {
      const testData = { id: 'pet-123', name: 'Updated Pet Name' };
      
      await apiClient.put('/pets/pet-123', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets/pet-123',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-Idempotency-Key': 'test-idempotency-789',
          }),
          body: JSON.stringify(testData),
        })
      );
    });

    test('should not include idempotency key in DELETE requests', async () => {
      await apiClient.delete('/pets/pet-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets/pet-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers['X-Idempotency-Key']).toBeUndefined();
    });
  });

  describe('Service Integration', () => {
    test('should call correlation ID service for each request', async () => {
      await apiClient.get('/pets');
      await apiClient.post('/pets', { name: 'Test' });

      expect(mockCorrelationIdService.getCorrelationId).toHaveBeenCalledTimes(2);
    });

    test('should call transaction ID generator for each request', async () => {
      await apiClient.get('/pets');
      await apiClient.post('/pets', { name: 'Test' });

      expect(mockGenerateTransactionId).toHaveBeenCalledTimes(2);
    });

    test('should call idempotency key generator only for mutation requests', async () => {
      await apiClient.get('/pets');
      await apiClient.post('/pets', { name: 'Test' });
      await apiClient.put('/pets/123', { name: 'Updated' });
      await apiClient.delete('/pets/123');

      // Only POST and PUT should generate idempotency keys
      expect(mockGenerateIdempotencyKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors properly', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(apiClient.get('/pets')).rejects.toThrow('Network error');
      
      // Should still have made the request with proper headers
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-123',
          }),
        })
      );
    });

    test('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ error: 'Pet not found' }),
        status: 404,
        ok: false,
      });

      // ApiClient should still return the response, not throw
      const result = await apiClient.get('/pets/nonexistent');
      expect(result).toEqual({ error: 'Pet not found' });
    });

    test('should handle service initialization errors gracefully', async () => {
      // Correlation service fails
      mockCorrelationIdService.getCorrelationId.mockRejectedValueOnce(
        new Error('Correlation service unavailable')
      );

      // Should still make the request (correlation ID would be undefined)
      await expect(apiClient.get('/pets')).rejects.toThrow();
    });
  });

  describe('RTK Query Base Query Integration', () => {
    test('should work with RTK Query baseQuery', async () => {
      const mockApi = {
        getState: jest.fn(() => ({})),
        dispatch: jest.fn(),
        extra: undefined,
        requestId: 'test-request-id',
        signal: new AbortController().signal,
      };

      const args = {
        url: '/pets/search',
        method: 'POST' as const,
        body: { filters: { type: ['dog'] } },
      };

      await baseQueryWithEnterpriseHeaders(args, mockApi, undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-123',
            'X-Transaction-ID': 'test-transaction-456',
            'X-Idempotency-Key': 'test-idempotency-789',
          }),
        })
      );
    });

    test('should include auth token when available in state', async () => {
      const mockApi = {
        getState: jest.fn(() => ({
          auth: { token: 'bearer-token-123' },
        })),
        dispatch: jest.fn(),
        extra: undefined,
        requestId: 'test-request-id',
        signal: new AbortController().signal,
      };

      await baseQueryWithEnterpriseHeaders('/pets', mockApi, undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer bearer-token-123',
          }),
        })
      );
    });
  });

  describe('Performance and Caching', () => {
    test('should generate fresh IDs for each request', async () => {
      await apiClient.get('/pets/1');
      await apiClient.get('/pets/2');

      // Each request should get fresh correlation and transaction IDs
      expect(mockCorrelationIdService.getCorrelationId).toHaveBeenCalledTimes(2);
      expect(mockGenerateTransactionId).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent requests properly', async () => {
      const requests = [
        apiClient.get('/pets/1'),
        apiClient.get('/pets/2'),
        apiClient.post('/favorites', { petId: 'pet-1' }),
      ];

      await Promise.all(requests);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockCorrelationIdService.getCorrelationId).toHaveBeenCalledTimes(3);
    });
  });
});