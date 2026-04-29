// ============================================================================
// Auth Context — Global auth state
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getItem, setItem, deleteItem } from '../utils/storage';
import { authApi, userApi } from '../services/api';
import { setUser as sentrySetUser, captureException } from '../lib/sentry';
import { getExpoPushToken } from '../lib/notifications';

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
  login: (
    email: string,
    password: string,
  ) => Promise<{ deleted: boolean; deletedAt: string | null; pendingUser: User | null }>;
  register: (data: {
    email: string;
    password: string;
    nickname: string;
    position: string;
    bio?: string;
    acceptedTosVersion?: string;
    acceptedPrivacyVersion?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  restoreAccount: (pendingUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Best-effort: register Expo Push token w/ backend. Silently skips if no
// projectId env, simulator, denied permission, or any error (push is
// non-critical UX — never block auth flow). Returns the token if registered
// (so logout can later unregister it) or null otherwise.
async function registerPushTokenForCurrentUser(): Promise<string | null> {
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) return null;

  const result = await getExpoPushToken(projectId);
  if (result.status !== 'ok') return null;

  try {
    await userApi.registerPushToken(result.token, result.platform);
    return result.token;
  } catch (err) {
    captureException(err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Remember the registered Expo push token so logout can unregister it.
  // useRef instead of useState — token churn must NOT trigger re-renders.
  const pendingTokenRef = useRef<string | null>(null);

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
          // Re-register push token on session restore (token may have rotated
          // since last launch). Best-effort — ignore failures.
          pendingTokenRef.current = await registerPushTokenForCurrentUser();
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
    // Persist token immediately so subsequent API calls (cancelDelete, getMe)
    // are authenticated. Backend returns `meta.deleted` + `meta.deletedAt`
    // ONLY for soft-deleted accounts (REQ-AD-4).
    await setItem('auth_token', res.data.token);
    const meta = (res as { meta?: { deleted?: boolean; deletedAt?: string | null } }).meta;
    const deleted = meta?.deleted === true;
    if (!deleted) {
      // Happy path — commit auth state and let RootNavigator switch stacks.
      setUser(res.data.user);
      sentrySetUser({ id: res.data.user.id, nickname: res.data.user.nickname });
      // Register Expo Push token on first commit (deferred-commit pattern:
      // soft-deleted users don't register until they confirm restore).
      pendingTokenRef.current = await registerPushTokenForCurrentUser();
    }
    // For soft-deleted accounts, the LoginScreen renders the restore banner
    // before we commit the user. This keeps the user on the auth stack until
    // they decide: restore (commit) or cancel (logout).
    return {
      deleted,
      deletedAt: meta?.deletedAt ?? null,
      pendingUser: deleted ? (res.data.user as User) : null,
    };
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      nickname: string;
      position: string;
      bio?: string;
      acceptedTosVersion?: string;
      acceptedPrivacyVersion?: string;
    }) => {
      const res = await authApi.register(data);
      await setItem('auth_token', res.data.token);
      setUser(res.data.user);
      sentrySetUser({ id: res.data.user.id, nickname: res.data.user.nickname });
      pendingTokenRef.current = await registerPushTokenForCurrentUser();
    },
    [],
  );

  const logout = useCallback(async () => {
    // Unregister Expo Push token BEFORE clearing the auth_token — backend
    // requires Authorization header on DELETE /me/push-tokens/:token. Best-
    // effort: failure must NOT block logout (offline / network error).
    if (pendingTokenRef.current) {
      try {
        await userApi.unregisterPushToken(pendingTokenRef.current);
      } catch (err) {
        captureException(err);
      }
      pendingTokenRef.current = null;
    }
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

  const restoreAccount = useCallback(async (pendingUser: User) => {
    // Restore = un-soft-delete on the backend, then commit the deferred user
    // captured at login time so the stack switches to MainTabs.
    await userApi.cancelDelete();
    setUser(pendingUser);
    sentrySetUser({ id: pendingUser.id, nickname: pendingUser.nickname });
    // Now that the soft-deleted user is restored and committed, register
    // push token (skipped during the deferred-commit phase).
    pendingTokenRef.current = await registerPushTokenForCurrentUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        restoreAccount,
      }}
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
