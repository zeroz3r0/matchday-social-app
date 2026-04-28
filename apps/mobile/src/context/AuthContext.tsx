// ============================================================================
// Auth Context — Global auth state
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getItem, setItem, deleteItem } from '../utils/storage';
import { authApi, userApi } from '../services/api';
import { setUser as sentrySetUser, captureException } from '../lib/sentry';

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

  // Check stored token on mount — with 5s timeout to avoid hanging
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const init = async () => {
      try {
        // Force stop loading after 5 seconds no matter what
        timeout = setTimeout(() => setIsLoading(false), 5000);

        const token = await getItem('auth_token');
        if (token) {
          const res = await userApi.getMe();
          setUser(res.data);
          sentrySetUser({ id: res.data.id, nickname: res.data.nickname });
        }
      } catch (err) {
        captureException(err);
        try {
          await deleteItem('auth_token');
        } catch (delErr) {
          captureException(delErr);
        }
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };

    init();
    return () => clearTimeout(timeout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setItem('auth_token', res.data.token);
    setUser(res.data.user);
    sentrySetUser({ id: res.data.user.id, nickname: res.data.user.nickname });
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      nickname: string;
      position: string;
      bio?: string;
    }) => {
      const res = await authApi.register(data);
      await setItem('auth_token', res.data.token);
      setUser(res.data.user);
      sentrySetUser({ id: res.data.user.id, nickname: res.data.user.nickname });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await deleteItem('auth_token');
    } catch (err) {
      captureException(err);
    }
    setUser(null);
    sentrySetUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await userApi.getMe();
      setUser(res.data);
    } catch (err) {
      captureException(err);
    }
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
