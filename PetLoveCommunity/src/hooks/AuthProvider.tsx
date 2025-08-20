import React, { createContext, useContext } from 'react';
import { useAuthLogic } from './useAuthLogic';

const AuthContext = createContext<ReturnType<typeof useAuthLogic>>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthLogic();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
