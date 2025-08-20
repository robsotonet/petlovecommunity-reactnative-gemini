import { useState, useEffect } from 'react';
import authService from '../services/authService';

export const useAuthLogic = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const credentials = await authService.getCredentials();
      setIsLoggedIn(!!credentials);
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
