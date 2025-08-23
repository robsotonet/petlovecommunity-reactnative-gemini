// Secure Storage Utility
// Provides secure storage functionality with cross-platform support

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Interface for secure storage operations
interface SecureStorageInterface {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

class SecureStorageService implements SecureStorageInterface {
  private readonly keyPrefix = 'secure_';

  /**
   * Store a value securely
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const secureKey = this.getSecureKey(key);
      // In a real implementation, this would use Keychain (iOS) or Keystore (Android)
      // For now, we'll use AsyncStorage with a prefix to indicate secure storage
      await AsyncStorage.setItem(secureKey, this.encrypt(value));
    } catch (error) {
      console.error('SecureStorage: Failed to set item', { key, error });
      throw new Error('Failed to store item securely');
    }
  }

  /**
   * Retrieve a value securely
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const secureKey = this.getSecureKey(key);
      const encryptedValue = await AsyncStorage.getItem(secureKey);
      
      if (encryptedValue === null) {
        return null;
      }

      return this.decrypt(encryptedValue);
    } catch (error) {
      console.error('SecureStorage: Failed to get item', { key, error });
      return null;
    }
  }

  /**
   * Remove a value securely
   */
  async removeItem(key: string): Promise<void> {
    try {
      const secureKey = this.getSecureKey(key);
      await AsyncStorage.removeItem(secureKey);
    } catch (error) {
      console.error('SecureStorage: Failed to remove item', { key, error });
      throw new Error('Failed to remove item securely');
    }
  }

  /**
   * Get all secure storage keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter(key => key.startsWith(this.keyPrefix))
        .map(key => key.replace(this.keyPrefix, ''));
    } catch (error) {
      console.error('SecureStorage: Failed to get all keys', error);
      return [];
    }
  }

  /**
   * Clear all secure storage
   */
  async clear(): Promise<void> {
    try {
      const secureKeys = await this.getAllKeys();
      const secureKeyPaths = secureKeys.map(key => this.getSecureKey(key));
      await AsyncStorage.multiRemove(secureKeyPaths);
    } catch (error) {
      console.error('SecureStorage: Failed to clear secure storage', error);
      throw new Error('Failed to clear secure storage');
    }
  }

  /**
   * Check if secure storage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test if we can write and read
      const testKey = 'test_availability';
      const testValue = 'test';
      
      await this.setItem(testKey, testValue);
      const retrievedValue = await this.getItem(testKey);
      await this.removeItem(testKey);
      
      return retrievedValue === testValue;
    } catch {
      return false;
    }
  }

  /**
   * Generate secure key with prefix
   */
  private getSecureKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Basic encryption (in production, use proper crypto libraries)
   */
  private encrypt(value: string): string {
    // This is a simple encoding for development/testing
    // In production, use proper encryption libraries like:
    // - react-native-keychain
    // - @react-native-async-storage/async-storage with encryption
    return Buffer.from(value, 'utf8').toString('base64');
  }

  /**
   * Basic decryption (in production, use proper crypto libraries)
   */
  private decrypt(encryptedValue: string): string {
    try {
      return Buffer.from(encryptedValue, 'base64').toString('utf8');
    } catch (error) {
      console.error('SecureStorage: Failed to decrypt value', error);
      throw new Error('Failed to decrypt stored value');
    }
  }

  /**
   * Get platform-specific secure storage recommendations
   */
  getStorageInfo(): {
    platform: string;
    isSecure: boolean;
    recommendations: string[];
  } {
    return {
      platform: Platform.OS,
      isSecure: false, // This implementation is not truly secure
      recommendations: [
        'Consider using react-native-keychain for production',
        'Implement proper encryption for sensitive data',
        'Use biometric authentication where available',
      ],
    };
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageService();

// Export individual functions for convenience
export const { setItem, getItem, removeItem, getAllKeys, clear } = secureStorage;

// Export class for testing
export { SecureStorageService };

// Export type
export type { SecureStorageInterface };