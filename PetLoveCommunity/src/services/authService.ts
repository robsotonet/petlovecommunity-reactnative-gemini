import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.petlovecommunity';

class AuthService {
  async setCredentials(username: string, token: string) {
    await Keychain.setGenericPassword(username, token, { service: KEYCHAIN_SERVICE });
  }

  async getCredentials() {
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    return credentials;
  }

  async loginWithBiometrics() {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: { title: 'Login to Pet Love Community' },
    });
    return credentials;
  }

  async resetCredentials() {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  }
}

const authService = new AuthService();
export default authService;
