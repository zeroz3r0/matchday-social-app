// ============================================================================
// Auth Context — Global auth state
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, userApi } from '../services/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  position: string;
  bio: string | null;
  city: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    nickname: string;
    position: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          const res = await userApi.getMe();
          setUser(res.data);
        }
      } catch {
        await SecureStore.deleteItemAsync('auth_token');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await SecureStore.setItemAsync('auth_token', res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; nickname: string; position: string; bio?: string }) => {
      const res = await authApi.register(data);
      await SecureStore.setItemAsync('auth_token', res.data.token);
      setUser(res.data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await userApi.getMe();
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
