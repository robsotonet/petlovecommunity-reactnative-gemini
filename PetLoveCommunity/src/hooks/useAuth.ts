import { useState, useEffect } from 'react';
import authService from '../services/authService';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const credentials = await authService.getCredentials();
        setIsLoggedIn(!!credentials);
      } catch (error) {
        // Handle credential check failures gracefully - default to logged out
        setIsLoggedIn(false);
      }
    };
    checkLoginStatus();
  }, []);

  const login = async (username: string, token: string) => {
    await authService.setCredentials(username, token);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await authService.resetCredentials();
    setIsLoggedIn(false);
  };

  return { isLoggedIn, login, logout };
};
