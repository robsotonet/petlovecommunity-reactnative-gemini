// Development utilities for testing and debugging
import authService from '../services/authService';

export const clearAllStoredData = async () => {
  try {
    console.log('DevUtils: Clearing all stored credentials and data...');
    await authService.resetCredentials();
    console.log('DevUtils: All stored data cleared successfully');
    return true;
  } catch (error) {
    console.error('DevUtils: Failed to clear stored data:', error);
    return false;
  }
};

export const logStoredCredentials = async () => {
  try {
    const credentials = await authService.getCredentials();
    console.log('DevUtils: Current stored credentials:', credentials ? {
      username: credentials.username,
      hasToken: !!credentials.password,
      tokenLength: credentials.password?.length || 0
    } : 'No credentials stored');
  } catch (error) {
    console.error('DevUtils: Failed to log credentials:', error);
  }
};