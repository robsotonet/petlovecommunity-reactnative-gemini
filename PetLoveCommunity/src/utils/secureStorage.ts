// Secure Storage Utility
// Provides secure storage functionality with cross-platform support
// Uses platform-specific secure storage mechanisms (Keychain/Keystore)
//
// PRODUCTION DEPENDENCIES REQUIRED:
// - react-native-keychain: For iOS Keychain and Android Keystore access
// - crypto-js: For AES-256-CBC encryption
//
// Installation:
// npm install react-native-keychain crypto-js
// cd ios && pod install (for iOS)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamic imports with fallbacks for missing dependencies
let Keychain: any = null;
let CryptoJS: any = null;

try {
  Keychain = require('react-native-keychain');
} catch (error) {
  console.warn('SecureStorage: react-native-keychain not found. Install for enhanced security.');
}

try {
  CryptoJS = require('crypto-js');
} catch (error) {
  console.warn('SecureStorage: crypto-js not found. Install for proper encryption.');
}

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
  private readonly appServiceName = 'PetLoveCommunity';
  private encryptionKey: string | null = null;

  /**
   * Initialize secure storage and get/create encryption key
   */
  private async initializeSecureStorage(): Promise<void> {
    if (this.encryptionKey) return;

    // Check if secure dependencies are available
    if (!Keychain || !CryptoJS) {
      console.warn('SecureStorage: Operating in compatibility mode. Install react-native-keychain and crypto-js for full security.');
      this.encryptionKey = this.generateFallbackKey();
      return;
    }

    try {
      // Try to get existing encryption key from Keychain/Keystore
      const credentials = await Keychain.getInternetCredentials(this.appServiceName);
      
      if (credentials) {
        this.encryptionKey = credentials.password;
      } else {
        // Generate new encryption key and store securely
        this.encryptionKey = this.generateEncryptionKey();
        await Keychain.setInternetCredentials(
          this.appServiceName, 
          'encryption_key', 
          this.encryptionKey
        );
      }
    } catch (error) {
      console.error('SecureStorage: Failed to initialize secure storage', error);
      // Fallback to device-specific key if Keychain unavailable
      this.encryptionKey = this.generateFallbackKey();
    }
  }

  /**
   * Store a value securely using platform-specific secure storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.initializeSecureStorage();
      
      // For critical authentication tokens, use Keychain directly if available
      if (this.isCriticalKey(key) && Keychain) {
        await Keychain.setInternetCredentials(
          `${this.appServiceName}_${key}`,
          key,
          value
        );
      } else {
        // For other sensitive data, use encryption with secure key
        const secureKey = this.getSecureKey(key);
        const encryptedValue = this.encrypt(value);
        await AsyncStorage.setItem(secureKey, encryptedValue);
      }
    } catch (error) {
      console.error('SecureStorage: Failed to set item', { key, error });
      throw new Error('Failed to store item securely');
    }
  }

  /**
   * Retrieve a value securely from platform-specific secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      await this.initializeSecureStorage();
      
      // For critical authentication tokens, retrieve from Keychain directly if available
      if (this.isCriticalKey(key) && Keychain) {
        const credentials = await Keychain.getInternetCredentials(`${this.appServiceName}_${key}`);
        return credentials ? credentials.password : null;
      } else {
        // For other data, decrypt from AsyncStorage
        const secureKey = this.getSecureKey(key);
        const encryptedValue = await AsyncStorage.getItem(secureKey);
        
        if (encryptedValue === null) {
          return null;
        }

        return this.decrypt(encryptedValue);
      }
    } catch (error) {
      console.error('SecureStorage: Failed to get item', { key, error });
      return null;
    }
  }

  /**
   * Remove a value securely from platform-specific secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      // For critical authentication tokens, remove from Keychain if available
      if (this.isCriticalKey(key) && Keychain) {
        await Keychain.resetInternetCredentials(`${this.appServiceName}_${key}`);
      } else {
        // For other data, remove from AsyncStorage
        const secureKey = this.getSecureKey(key);
        await AsyncStorage.removeItem(secureKey);
      }
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
   * Secure encryption using CryptoJS or fallback method
   */
  private encrypt(value: string): string {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      // Use AES encryption if CryptoJS is available
      if (CryptoJS) {
        // Generate random IV for each encryption
        const iv = CryptoJS.lib.WordArray.random(16);
        
        // Encrypt using AES-256-CBC
        const encrypted = CryptoJS.AES.encrypt(value, this.encryptionKey, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.PKCS7
        });
        
        // Combine IV and encrypted data
        const combined = iv.toString() + ':' + encrypted.toString();
        return combined;
      } else {
        // Fallback to XOR cipher with key (better than base64 but not production-secure)
        console.warn('SecureStorage: Using fallback encryption. Install crypto-js for production security.');
        return this.xorEncrypt(value);
      }
    } catch (error) {
      console.error('SecureStorage: Failed to encrypt value', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Secure decryption using CryptoJS or fallback method
   */
  private decrypt(encryptedValue: string): string {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      // Use AES decryption if CryptoJS is available
      if (CryptoJS && encryptedValue.includes(':')) {
        // Split IV and encrypted data
        const parts = encryptedValue.split(':');
        if (parts.length !== 2) {
          throw new Error('Invalid encrypted data format');
        }
        
        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const encrypted = parts[1];
        
        // Decrypt using AES-256-CBC
        const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.PKCS7
        });
        
        return decrypted.toString(CryptoJS.enc.Utf8);
      } else {
        // Fallback to XOR decryption or legacy base64
        return this.xorDecrypt(encryptedValue);
      }
    } catch (error) {
      console.error('SecureStorage: Failed to decrypt value', error);
      throw new Error('Failed to decrypt stored value');
    }
  }

  /**
   * Generate cryptographically secure encryption key
   */
  private generateEncryptionKey(): string {
    if (CryptoJS) {
      // Generate 256-bit (32 bytes) random key
      return CryptoJS.lib.WordArray.random(32).toString();
    } else {
      // Fallback to timestamp-based key
      return this.generateFallbackKey();
    }
  }

  /**
   * Generate device-specific fallback key
   */
  private generateFallbackKey(): string {
    // Use device and app specific data for key generation
    const deviceData = Platform.OS + Platform.Version + this.appServiceName + Date.now();
    
    if (CryptoJS) {
      return CryptoJS.SHA256(deviceData).toString();
    } else {
      // Simple hash fallback (not cryptographically secure)
      let hash = 0;
      for (let i = 0; i < deviceData.length; i++) {
        const char = deviceData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).padStart(32, '0');
    }
  }

  /**
   * XOR encryption fallback (better than base64, but not production-secure)
   */
  private xorEncrypt(value: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const keyBytes = Array.from(this.encryptionKey).map(c => c.charCodeAt(0));
    const valueBytes = Array.from(value).map(c => c.charCodeAt(0));
    
    const encrypted = valueBytes.map((byte, i) => {
      const keyByte = keyBytes[i % keyBytes.length];
      return byte ^ keyByte;
    });
    
    // Convert to hex string
    return encrypted.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * XOR decryption fallback
   */
  private xorDecrypt(encryptedValue: string): string {
    try {
      // Handle legacy base64 format
      if (!encryptedValue.match(/^[0-9a-fA-F]+$/)) {
        return Buffer.from(encryptedValue, 'base64').toString('utf8');
      }
      
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }
      
      // Convert hex string back to bytes
      const encrypted = [];
      for (let i = 0; i < encryptedValue.length; i += 2) {
        encrypted.push(parseInt(encryptedValue.substr(i, 2), 16));
      }
      
      const keyBytes = Array.from(this.encryptionKey).map(c => c.charCodeAt(0));
      
      const decrypted = encrypted.map((byte, i) => {
        const keyByte = keyBytes[i % keyBytes.length];
        return String.fromCharCode(byte ^ keyByte);
      });
      
      return decrypted.join('');
    } catch (error) {
      console.error('SecureStorage: XOR decryption failed, trying base64 fallback', error);
      return Buffer.from(encryptedValue, 'base64').toString('utf8');
    }
  }

  /**
   * Determine if a key should be stored in Keychain vs encrypted AsyncStorage
   */
  private isCriticalKey(key: string): boolean {
    const criticalKeys = ['AUTH_TOKEN', 'REFRESH_TOKEN', 'BIOMETRIC_KEY', 'USER_CREDENTIALS'];
    return criticalKeys.includes(key.toUpperCase());
  }

  /**
   * Get platform-specific secure storage information
   */
  getStorageInfo(): {
    platform: string;
    isSecure: boolean;
    features: string[];
    securityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    dependencies: {
      keychain: boolean;
      crypto: boolean;
    };
  } {
    const hasKeychain = !!Keychain;
    const hasCrypto = !!CryptoJS;
    const isFullySecure = hasKeychain && hasCrypto;
    
    return {
      platform: Platform.OS,
      isSecure: isFullySecure,
      features: [
        hasKeychain ? 'Platform-specific Keychain/Keystore for critical tokens' : 'Critical tokens stored with encryption',
        hasCrypto ? 'AES-256-CBC encryption for sensitive data' : 'XOR encryption fallback (install crypto-js for production)',
        hasCrypto ? 'Cryptographically secure key generation' : 'Device-based key generation',
        hasCrypto ? 'Random IV for each encryption operation' : 'Static key-based encryption',
        hasKeychain ? 'Automatic key rotation capability' : 'Manual key management',
        'Backward compatibility with legacy data',
      ],
      securityLevel: isFullySecure ? 'HIGH' : hasCrypto ? 'MEDIUM' : 'LOW',
      dependencies: {
        keychain: hasKeychain,
        crypto: hasCrypto,
      },
    };
  }

  /**
   * Test if Keychain is available on the device
   */
  async testKeychainAvailability(): Promise<boolean> {
    if (!Keychain) {
      console.warn('SecureStorage: react-native-keychain not installed');
      return false;
    }

    try {
      const testKey = 'keychain_availability_test';
      await Keychain.setInternetCredentials(testKey, 'test', 'test');
      await Keychain.resetInternetCredentials(testKey);
      return true;
    } catch (error) {
      console.warn('SecureStorage: Keychain not available, falling back to encrypted AsyncStorage');
      return false;
    }
  }

  /**
   * Rotate encryption key (for enhanced security)
   */
  async rotateEncryptionKey(): Promise<void> {
    if (!Keychain) {
      console.warn('SecureStorage: Key rotation requires react-native-keychain');
      throw new Error('Key rotation requires react-native-keychain');
    }

    try {
      console.log('SecureStorage: Starting key rotation');
      
      // Get all current data
      const allKeys = await this.getAllKeys();
      const dataBackup: { [key: string]: string | null } = {};
      
      for (const key of allKeys) {
        if (!this.isCriticalKey(key)) {
          dataBackup[key] = await this.getItem(key);
        }
      }
      
      // Generate new encryption key
      const newKey = this.generateEncryptionKey();
      await Keychain.setInternetCredentials(
        this.appServiceName,
        'encryption_key',
        newKey
      );
      
      this.encryptionKey = newKey;
      
      // Re-encrypt all data with new key
      for (const [key, value] of Object.entries(dataBackup)) {
        if (value !== null) {
          await this.setItem(key, value);
        }
      }
      
      console.log('SecureStorage: Key rotation completed successfully');
    } catch (error) {
      console.error('SecureStorage: Key rotation failed', error);
      throw new Error('Failed to rotate encryption key');
    }
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