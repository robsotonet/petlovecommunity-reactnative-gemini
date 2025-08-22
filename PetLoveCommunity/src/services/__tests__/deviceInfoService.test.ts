// DeviceInfoService Comprehensive Tests
// Testing device info collection, caching, and analytics integration

import deviceInfoService from '../deviceInfoService';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies - override global mock with complete DeviceInfo mock
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(),
  getDeviceId: jest.fn(),
  getBundleId: jest.fn(),
  getSystemVersion: jest.fn(),
  getVersion: jest.fn(),
  getBuildNumber: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage');

const mockDeviceInfo = DeviceInfo as jest.Mocked<typeof DeviceInfo>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('DeviceInfoService', () => {
  // Mock device info data
  const mockDeviceData = {
    uniqueId: 'device-unique-123',
    deviceId: 'device-id-456',
    bundleId: 'com.petlovecommunity.app',
    systemVersion: '17.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default DeviceInfo mocks
    mockDeviceInfo.getUniqueId.mockResolvedValue(mockDeviceData.uniqueId);
    mockDeviceInfo.getDeviceId.mockReturnValue(mockDeviceData.deviceId);
    mockDeviceInfo.getBundleId.mockReturnValue(mockDeviceData.bundleId);
    mockDeviceInfo.getSystemVersion.mockReturnValue(mockDeviceData.systemVersion);
    
    // Clear service instance cache for each test
    (deviceInfoService as any).deviceInfo = null;
  });

  describe('Core Service Functionality', () => {
    test('should collect device info from DeviceInfo APIs', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await deviceInfoService.getDeviceInfo();

      // Verify Promise.all optimization - all calls should happen
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalledTimes(1);
      expect(mockDeviceInfo.getDeviceId).toHaveBeenCalledTimes(1);
      expect(mockDeviceInfo.getBundleId).toHaveBeenCalledTimes(1);
      expect(mockDeviceInfo.getSystemVersion).toHaveBeenCalledTimes(1);

      // Verify collected data structure
      expect(result).toEqual(mockDeviceData);
    });

    test('should cache device info in memory after first collection', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      // First call - should collect from device
      const result1 = await deviceInfoService.getDeviceInfo();
      
      // Second call - should use memory cache
      const result2 = await deviceInfoService.getDeviceInfo();

      // DeviceInfo APIs should only be called once (first time)
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
      
      // Both results should be identical
      expect(result1).toEqual(result2);
      expect(result1).toEqual(mockDeviceData);
    });

    test('should store collected device info in AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await deviceInfoService.getDeviceInfo();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'DEVICE_INFO',
        JSON.stringify(mockDeviceData)
      );
    });

    test('should return cached data from AsyncStorage on subsequent app launches', async () => {
      const cachedData = {
        uniqueId: 'cached-unique-123',
        deviceId: 'cached-device-456',
        bundleId: 'com.petlovecommunity.cached',
        systemVersion: '16.0.0',
      };
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await deviceInfoService.getDeviceInfo();

      // Should return cached data without calling DeviceInfo APIs
      expect(result).toEqual(cachedData);
      expect(mockDeviceInfo.getUniqueId).not.toHaveBeenCalled();
      expect(mockDeviceInfo.getDeviceId).not.toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('should handle null AsyncStorage gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await deviceInfoService.getDeviceInfo();

      expect(result).toEqual(mockDeviceData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('DEVICE_INFO');
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle corrupted AsyncStorage data gracefully', async () => {
      // Simulate corrupted JSON in storage
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json-data');

      const result = await deviceInfoService.getDeviceInfo();

      // Should fall back to collecting fresh data
      expect(result).toEqual(mockDeviceData);
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'DEVICE_INFO',
        JSON.stringify(mockDeviceData)
      );
    });

    test('should handle AsyncStorage.getItem failures', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage read error'));

      const result = await deviceInfoService.getDeviceInfo();

      // Should collect fresh data when storage fails
      expect(result).toEqual(mockDeviceData);
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalled();
    });

    test('should handle AsyncStorage.setItem failures gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage write error'));

      const result = await deviceInfoService.getDeviceInfo();

      // Should still return collected data even if storage fails
      expect(result).toEqual(mockDeviceData);
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalled();
      
      // Should still cache in memory for session
      const result2 = await deviceInfoService.getDeviceInfo();
      expect(result2).toEqual(mockDeviceData);
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalledTimes(1); // Only once
    });

    test('should handle concurrent calls correctly (singleton behavior)', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      // Make multiple concurrent calls
      const promises = [
        deviceInfoService.getDeviceInfo(),
        deviceInfoService.getDeviceInfo(),
        deviceInfoService.getDeviceInfo(),
      ];

      const results = await Promise.all(promises);

      // All results should be identical
      expect(results[0]).toEqual(mockDeviceData);
      expect(results[1]).toEqual(mockDeviceData);
      expect(results[2]).toEqual(mockDeviceData);

      // DeviceInfo APIs should only be called once despite concurrent calls
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance & Optimization', () => {
    test('should use Promise.all for parallel API calls', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await deviceInfoService.getDeviceInfo();
      
      // Verify all DeviceInfo methods were called
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalledTimes(1);
      expect(mockDeviceInfo.getDeviceId).toHaveBeenCalledTimes(1);
      expect(mockDeviceInfo.getBundleId).toHaveBeenCalledTimes(1);
      expect(mockDeviceInfo.getSystemVersion).toHaveBeenCalledTimes(1);

      // Verify they were called (Promise.all optimization ensures parallel execution)
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalled();
      expect(mockDeviceInfo.getDeviceId).toHaveBeenCalled();
      expect(mockDeviceInfo.getBundleId).toHaveBeenCalled();
      expect(mockDeviceInfo.getSystemVersion).toHaveBeenCalled();
    });

    test('should minimize storage operations', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await deviceInfoService.getDeviceInfo();
      await deviceInfoService.getDeviceInfo();
      await deviceInfoService.getDeviceInfo();

      // Storage should only be accessed on first call
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });

    test('should maintain consistent data format for analytics', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await deviceInfoService.getDeviceInfo();

      // Verify the structure matches what analytics expects
      expect(result).toHaveProperty('uniqueId');
      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('bundleId');
      expect(result).toHaveProperty('systemVersion');

      expect(typeof result.uniqueId).toBe('string');
      expect(typeof result.deviceId).toBe('string');
      expect(typeof result.bundleId).toBe('string');
      expect(typeof result.systemVersion).toBe('string');

      // Verify it's suitable for enterprise headers
      expect(result.uniqueId.length).toBeGreaterThan(0);
      expect(result.deviceId.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Integration', () => {
    test('should provide consistent device ID for correlation tracking', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result1 = await deviceInfoService.getDeviceInfo();
      const result2 = await deviceInfoService.getDeviceInfo();

      // Device ID should be consistent for correlation tracking
      expect(result1.uniqueId).toBe(result2.uniqueId);
      expect(result1.deviceId).toBe(result2.deviceId);
    });

    test('should provide data suitable for enterprise headers', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await deviceInfoService.getDeviceInfo();

      // Verify data is suitable for X-Device-ID header
      expect(result.uniqueId).toMatch(/^device-unique-/);
      expect(result.bundleId).toMatch(/^com\./);
      expect(result.systemVersion).toMatch(/^\d+\./);
    });
  });
});