import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, MeResponse } from '../types/auth.types';
import { api } from '../services/api';

const DEFAULT_USER: User = {
  id: 'admin',
  username: 'admin',
  email: 'admin@browseros.local',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface AuthContextType {
  user: User;
  token: string | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [token] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function syncCurrentUser() {
      try {
        const res = await api.get<MeResponse>('/auth/me');
        if (res.data) {
          setUser(res.data);
        }
      } catch {
        // Fallback to default user if backend is still booting
      } finally {
        setIsLoading(false);
      }
    }

    syncCurrentUser();
  }, []);

  const login = async () => {};
  const register = async () => {};
  const logout = () => {
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
