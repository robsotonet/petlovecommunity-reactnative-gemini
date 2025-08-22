import { useState, useEffect } from 'react';
import authService from '../services/authService';
import authApi from '../services/authApi';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      console.log('useAuth: Checking login status...');
      try {
        setIsLoading(true);
        const credentials = await authService.getCredentials();
        
        if (!credentials) {
          console.log('useAuth: No credentials found');
          setIsLoggedIn(false);
          return;
        }
        
        // Validate token with server
        try {
          const isValidToken = await authApi.validateToken(credentials.password); // password field contains token
          
          if (isValidToken) {
            console.log('useAuth: Valid token found, user is logged in');
            setIsLoggedIn(true);
          } else {
            console.log('useAuth: Invalid token, clearing credentials');
            await authService.resetCredentials();
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.warn('useAuth: Token validation failed, assuming invalid:', error);
          await authService.resetCredentials();
          setIsLoggedIn(false);
        }
        
        console.log('useAuth: Login status check completed');
      } catch (error) {
        console.error('useAuth: Error checking login status:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  const login = async (username: string, password: string) => {
    console.log('useAuth: Attempting login for user:', username);
    try {
      // Validate inputs
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Authenticate with server
      const response = await authApi.login({ username, password });
      
      if (!response.success) {
        throw new Error('Authentication failed');
      }
      
      // Store credentials securely
      await authService.setCredentials(username, response.token);
      setIsLoggedIn(true);
      console.log('useAuth: Login successful for user:', response.user.displayName);
      
    } catch (error) {
      console.error('useAuth: Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('useAuth: Attempting logout');
    try {
      const credentials = await authService.getCredentials();
      
      // Immediately set logged out state to trigger navigation
      setIsLoggedIn(false);
      
      // Notify server of logout (if we have a token)
      if (credentials && credentials.password) {
        try {
          await authApi.logout(credentials.password); // password field contains the token
        } catch (error) {
          console.warn('useAuth: Server logout failed, proceeding with local logout:', error);
        }
      }
      
      // Clear local credentials
      await authService.resetCredentials();
      console.log('useAuth: Logout successful');
    } catch (error) {
      console.error('useAuth: Logout failed:', error);
      // Ensure we're logged out even if there's an error
      setIsLoggedIn(false);
      await authService.resetCredentials();
      throw error;
    }
  };

  return { isLoggedIn, isLoading, login, logout };
};
