import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from './useAuth';

const AuthContext = createContext<ReturnType<typeof useAuthHook>>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthHook();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
