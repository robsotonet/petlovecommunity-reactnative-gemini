import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.petlovecommunity';

class AuthService {
  async setCredentials(username: string, token: string) {
    try {
      console.log('AuthService: Setting credentials for user:', username);
      await Keychain.setGenericPassword(username, token, { service: KEYCHAIN_SERVICE });
      console.log('AuthService: Credentials set successfully');
    } catch (error) {
      console.error('AuthService: Failed to set credentials:', error);
      throw new Error('Failed to save credentials securely');
    }
  }

  async getCredentials() {
    try {
      console.log('AuthService: Retrieving credentials...');
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      if (credentials !== false) {
        console.log('AuthService: Credentials found for user:', credentials.username);
        return credentials;
      } else {
        console.log('AuthService: No credentials found');
        return false;
      }
    } catch (error) {
      console.error('AuthService: Failed to get credentials:', error);
      return false;
    }
  }

  async loginWithBiometrics() {
    try {
      console.log('AuthService: Attempting biometric login...');
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
        authenticationPrompt: { title: 'Login to Pet Love Community' },
      });
      console.log('AuthService: Biometric login result:', !!credentials);
      return credentials;
    } catch (error) {
      console.error('AuthService: Biometric login failed:', error);
      throw new Error('Biometric authentication failed');
    }
  }

  async resetCredentials() {
    try {
      console.log('AuthService: Resetting credentials...');
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
      console.log('AuthService: Credentials reset successfully');
    } catch (error) {
      console.error('AuthService: Failed to reset credentials:', error);
      throw new Error('Failed to clear credentials');
    }
  }
}

const authService = new AuthService();
export default authService;
