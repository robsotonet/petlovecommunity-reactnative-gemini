import { useState, useEffect } from 'react';
import authService from '../services/authService';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      console.log('useAuth: Checking login status...');
      try {
        setIsLoading(true);
        const credentials = await authService.getCredentials();
        const loggedIn = !!credentials;
        console.log('useAuth: Login status check result:', { loggedIn, hasCredentials: !!credentials });
        setIsLoggedIn(loggedIn);
      } catch (error) {
        console.error('useAuth: Error checking login status:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  const login = async (username: string, token: string) => {
    console.log('useAuth: Attempting login for user:', username);
    try {
      await authService.setCredentials(username, token);
      setIsLoggedIn(true);
      console.log('useAuth: Login successful');
    } catch (error) {
      console.error('useAuth: Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('useAuth: Attempting logout');
    try {
      await authService.resetCredentials();
      setIsLoggedIn(false);
      console.log('useAuth: Logout successful');
    } catch (error) {
      console.error('useAuth: Logout failed:', error);
      throw error;
    }
  };

  return { isLoggedIn, isLoading, login, logout };
};
