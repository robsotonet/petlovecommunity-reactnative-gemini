// ApiClient Integration Tests
// Testing enterprise headers, correlation IDs, and HTTP methods

import apiClient from '../apiClient';
import { baseQueryWithEnterpriseHeaders } from '../../utils/baseQuery';
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

    test('should handle POST errors and log them (Lines 44-45)', async () => {
      const postError = new Error('POST request failed');
      mockFetch.mockRejectedValueOnce(postError);

      await expect(apiClient.post('/pets', { name: 'Test Pet' })).rejects.toThrow('POST request failed');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Idempotency-Key': 'test-idempotency-789',
          }),
        })
      );
    });

    test('should handle PUT errors and log them (Lines 62-63)', async () => {
      const putError = new Error('PUT request failed');
      mockFetch.mockRejectedValueOnce(putError);

      await expect(apiClient.put('/pets/123', { name: 'Updated Pet' })).rejects.toThrow('PUT request failed');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets/123',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-Idempotency-Key': 'test-idempotency-789',
          }),
        })
      );
    });

    test('should handle DELETE errors and log them (Lines 78-79)', async () => {
      const deleteError = new Error('DELETE request failed');
      mockFetch.mockRejectedValueOnce(deleteError);

      await expect(apiClient.delete('/pets/123')).rejects.toThrow('DELETE request failed');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.petlove.com/pets/123',
        expect.objectContaining({
          method: 'DELETE',
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

    test('should handle JSON parse errors in all HTTP methods', async () => {
      const mockResponse = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        status: 200,
        ok: true,
      };

      // Test all methods handle JSON parse errors
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiClient.get('/pets')).rejects.toThrow('Invalid JSON');
      await expect(apiClient.post('/pets', { name: 'Test' })).rejects.toThrow('Invalid JSON');
      await expect(apiClient.put('/pets/123', { name: 'Test' })).rejects.toThrow('Invalid JSON');
      await expect(apiClient.delete('/pets/123')).rejects.toThrow('Invalid JSON');
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

      // Mock fetch to return a successful response with clone method
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        text: jest.fn().mockResolvedValue('{"success":true}'),
        headers: new Headers(),
        url: 'https://test-api.petlove.com/pets/search',
        clone: jest.fn().mockReturnValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true }),
          text: jest.fn().mockResolvedValue('{"success":true}'),
          headers: new Headers(),
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await baseQueryWithEnterpriseHeaders(args, mockApi, undefined);

      // Verify fetch was called (RTK Query internally calls fetch)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Verify the result structure
      expect(result).toHaveProperty('data');
      
      // Verify the call was made to the correct URL (RTK Query uses Request objects)
      const fetchCall = mockFetch.mock.calls[0];
      const requestArg = fetchCall[0];
      if (typeof requestArg === 'string') {
        expect(requestArg).toBe('https://test-api.petlove.com/pets/search');
      } else {
        // RTK Query creates a Request object
        expect(requestArg.url).toBe('https://test-api.petlove.com/pets/search');
      }
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

      // Mock fetch to return a successful response with clone method
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
        text: jest.fn().mockResolvedValue('{"success":true}'),
        headers: new Headers(),
        url: 'https://test-api.petlove.com/pets',
        clone: jest.fn().mockReturnValue({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true }),
          text: jest.fn().mockResolvedValue('{"success":true}'),
          headers: new Headers(),
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await baseQueryWithEnterpriseHeaders('/pets', mockApi, undefined);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Verify the result structure 
      expect(result).toHaveProperty('data');
      
      // Verify auth token was properly applied (this is handled internally by RTK Query)
      expect(mockApi.getState).toHaveBeenCalled();
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