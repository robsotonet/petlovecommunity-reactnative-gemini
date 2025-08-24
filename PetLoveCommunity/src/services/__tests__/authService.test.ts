// AuthService Comprehensive Integration Tests
// Testing secure credential storage, biometric authentication, and Keychain integration

import authService from '../authService';
import * as Keychain from 'react-native-keychain';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  ACCESS_CONTROL: {
    BIOMETRY_ANY: 'BIOMETRY_ANY',
    TOUCH_ID: 'TOUCH_ID',
    FACE_ID: 'FACE_ID',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'DEVICE_PASSCODE_OR_BIOMETRICS',
  },
}));

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('AuthService Integration Tests', () => {
  const KEYCHAIN_SERVICE = 'com.petlovecommunity';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Credential Storage Operations', () => {
    test('setCredentials should store credentials with correct service configuration', async () => {
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);

      await authService.setCredentials('testuser', 'token123');

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        'testuser',
        'token123',
        { service: KEYCHAIN_SERVICE }
      );
      expect(mockKeychain.setGenericPassword).toHaveBeenCalledTimes(1);
    });

    test('setCredentials should handle empty credentials', async () => {
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);

      await authService.setCredentials('', '');

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        '',
        '',
        { service: KEYCHAIN_SERVICE }
      );
    });

    test('setCredentials should handle special characters in credentials', async () => {
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      
      const specialUsername = 'user@domain.com';
      const specialToken = 'token!@#$%^&*()_+{}[]|:";\'<>?,./-=`~';

      await authService.setCredentials(specialUsername, specialToken);

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        specialUsername,
        specialToken,
        { service: KEYCHAIN_SERVICE }
      );
    });

    test('setCredentials should handle very long credential strings', async () => {
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      
      const longUsername = 'a'.repeat(1000);
      const longToken = 'b'.repeat(5000);

      await authService.setCredentials(longUsername, longToken);

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        longUsername,
        longToken,
        { service: KEYCHAIN_SERVICE }
      );
    });

    test('setCredentials should propagate Keychain errors', async () => {
      const keychainError = new Error('Keychain access denied');
      mockKeychain.setGenericPassword.mockRejectedValueOnce(keychainError);

      await expect(authService.setCredentials('testuser', 'token123'))
        .rejects.toThrow('Failed to save credentials securely');

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Credential Retrieval Operations', () => {
    test('getCredentials should retrieve credentials with correct service configuration', async () => {
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockKeychain.getGenericPassword.mockResolvedValueOnce(mockCredentials);

      const result = await authService.getCredentials();

      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE
      });
      expect(result).toEqual(mockCredentials);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);
    });

    test('getCredentials should return false when no credentials exist', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

      const result = await authService.getCredentials();

      expect(result).toBe(false);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE
      });
    });

    test('getCredentials should handle Keychain errors', async () => {
      const keychainError = new Error('Keychain read error');
      mockKeychain.getGenericPassword.mockRejectedValueOnce(keychainError);

      // authService.getCredentials returns false instead of throwing on error
      const result = await authService.getCredentials();
      expect(result).toBe(false);
    });

    test('getCredentials should return credentials with all expected fields', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'token123',
        service: KEYCHAIN_SERVICE,
        storage: 'keychain'
      };
      mockKeychain.getGenericPassword.mockResolvedValueOnce(mockCredentials);

      const result = await authService.getCredentials();

      expect(result).toEqual(mockCredentials);
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('password');
    });
  });

  describe('Biometric Authentication', () => {
    test('loginWithBiometrics should call getGenericPassword with authentication prompt', async () => {
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockKeychain.getGenericPassword.mockResolvedValueOnce(mockCredentials);

      const result = await authService.loginWithBiometrics();

      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE,
        authenticationPrompt: { title: 'Login to Pet Love Community' }
      });
      expect(result).toEqual(mockCredentials);
    });

    test('loginWithBiometrics should return false when authentication fails', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

      const result = await authService.loginWithBiometrics();

      expect(result).toBe(false);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE,
        authenticationPrompt: { title: 'Login to Pet Love Community' }
      });
    });

    test('loginWithBiometrics should handle biometric authentication errors', async () => {
      const biometricError = new Error('User canceled biometric authentication');
      mockKeychain.getGenericPassword.mockRejectedValueOnce(biometricError);

      await expect(authService.loginWithBiometrics())
        .rejects.toThrow('Biometric authentication failed');
    });

    test('loginWithBiometrics should handle device without biometric support', async () => {
      const noHardwareError = new Error('BiometryNotAvailable');
      mockKeychain.getGenericPassword.mockRejectedValueOnce(noHardwareError);

      await expect(authService.loginWithBiometrics())
        .rejects.toThrow('Biometric authentication failed');
    });
  });

  describe('Credential Reset Operations', () => {
    test('resetCredentials should clear credentials with correct service configuration', async () => {
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(true);

      await authService.resetCredentials();

      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE
      });
      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledTimes(1);
    });

    test('resetCredentials should handle reset when no credentials exist', async () => {
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(false);

      await authService.resetCredentials();

      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE
      });
    });

    test('resetCredentials should handle Keychain reset errors', async () => {
      const resetError = new Error('Keychain reset failed');
      mockKeychain.resetGenericPassword.mockRejectedValueOnce(resetError);

      await expect(authService.resetCredentials())
        .rejects.toThrow('Failed to clear credentials');
    });
  });

  describe('Complete Authentication Flows', () => {
    test('should handle complete login flow', async () => {
      // Set credentials
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      await authService.setCredentials('testuser', 'token123');

      // Retrieve credentials
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockKeychain.getGenericPassword.mockResolvedValueOnce(mockCredentials);
      const credentials = await authService.getCredentials();

      expect(credentials).toEqual(mockCredentials);
      expect(mockKeychain.setGenericPassword).toHaveBeenCalledTimes(1);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);
    });

    test('should handle complete logout flow', async () => {
      // Set credentials first
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      await authService.setCredentials('testuser', 'token123');

      // Reset credentials
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(true);
      await authService.resetCredentials();

      // Verify credentials are gone
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);
      const credentials = await authService.getCredentials();

      expect(credentials).toBe(false);
      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledTimes(1);
    });

    test('should handle biometric login flow', async () => {
      // Set credentials with biometric protection
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      await authService.setCredentials('testuser', 'token123');

      // Login with biometrics
      const mockCredentials = { username: 'testuser', password: 'token123' };
      mockKeychain.getGenericPassword.mockResolvedValueOnce(mockCredentials);
      const biometricCredentials = await authService.loginWithBiometrics();

      expect(biometricCredentials).toEqual(mockCredentials);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE,
        authenticationPrompt: { title: 'Login to Pet Love Community' }
      });
    });

    test('should handle credential update flow', async () => {
      // Set initial credentials
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      await authService.setCredentials('user1', 'token1');

      // Update credentials
      mockKeychain.setGenericPassword.mockResolvedValueOnce(true);
      await authService.setCredentials('user2', 'token2');

      // Verify updated credentials
      const updatedCredentials = { username: 'user2', password: 'token2' };
      mockKeychain.getGenericPassword.mockResolvedValueOnce(updatedCredentials);
      const result = await authService.getCredentials();

      expect(result).toEqual(updatedCredentials);
      expect(mockKeychain.setGenericPassword).toHaveBeenCalledTimes(2);
      expect(mockKeychain.setGenericPassword).toHaveBeenLastCalledWith(
        'user2',
        'token2',
        { service: KEYCHAIN_SERVICE }
      );
    });
  });

  describe('Service Configuration and Security', () => {
    test('should use consistent service identifier across all operations', async () => {
      mockKeychain.setGenericPassword.mockResolvedValue(true);
      mockKeychain.getGenericPassword.mockResolvedValue(false);
      mockKeychain.resetGenericPassword.mockResolvedValue(true);

      // Perform all operations
      await authService.setCredentials('test', 'token');
      await authService.getCredentials();
      await authService.loginWithBiometrics();
      await authService.resetCredentials();

      // Verify all calls used the same service identifier
      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        'test', 'token', { service: KEYCHAIN_SERVICE }
      );
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE
      });
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE,
        authenticationPrompt: { title: 'Login to Pet Love Community' }
      });
      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledWith({
        service: KEYCHAIN_SERVICE
      });
    });

    test('should maintain singleton service instance', () => {
      // Import the service multiple times to test singleton
      const authService1 = require('../authService').default;
      const authService2 = require('../authService').default;

      expect(authService1).toBe(authService2);
      expect(authService1).toBe(authService);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle concurrent credential operations', async () => {
      mockKeychain.setGenericPassword.mockResolvedValue(true);
      mockKeychain.getGenericPassword.mockResolvedValue({ username: 'test', password: 'token' });
      mockKeychain.resetGenericPassword.mockResolvedValue(true);

      // Perform concurrent operations
      const promises = [
        authService.setCredentials('user1', 'token1'),
        authService.getCredentials(),
        authService.setCredentials('user2', 'token2'),
        authService.resetCredentials()
      ];

      await Promise.all(promises);

      // All operations should complete
      expect(mockKeychain.setGenericPassword).toHaveBeenCalledTimes(2);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);
      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledTimes(1);
    });

    test('should handle null/undefined parameters gracefully', async () => {
      mockKeychain.setGenericPassword.mockResolvedValue(true);

      // Test with null values - should still call Keychain
      await authService.setCredentials(null as any, null as any);

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        null, null, { service: KEYCHAIN_SERVICE }
      );
    });

    test('should handle Keychain service unavailable scenarios', async () => {
      const serviceError = new Error('Keychain service unavailable');
      mockKeychain.setGenericPassword.mockRejectedValue(serviceError);
      mockKeychain.getGenericPassword.mockRejectedValue(serviceError);
      mockKeychain.resetGenericPassword.mockRejectedValue(serviceError);

      // Operations should handle errors according to their implementation
      await expect(authService.setCredentials('test', 'token'))
        .rejects.toThrow('Failed to save credentials securely');
      
      // getCredentials returns false on error instead of throwing
      const result = await authService.getCredentials();
      expect(result).toBe(false);
      
      await expect(authService.loginWithBiometrics())
        .rejects.toThrow('Biometric authentication failed');
      await expect(authService.resetCredentials())
        .rejects.toThrow('Failed to clear credentials');
    });
  });
});