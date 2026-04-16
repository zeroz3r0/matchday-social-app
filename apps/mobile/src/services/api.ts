// ============================================================================
// API Client — Fetch wrapper with auth
// ============================================================================

import { getItem } from '../utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

async function getToken(): Promise<string | null> {
  return getItem('auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { error: { message: response.statusText } };
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN',
      data.error?.message || 'Error desconocido',
    );
  }

  return data;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: {
    email: string;
    password: string;
    nickname: string;
    position: string;
    bio?: string;
  }) =>
    request<{ success: true; data: { user: any; token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (email: string, password: string) =>
    request<{ success: true; data: { user: any; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Users ──────────────────────────────────────────────────────────────────

export const userApi = {
  getMe: () => request<{ success: true; data: any }>('/users/me'),
  getProfile: (id: string) => request<{ success: true; data: any }>(`/users/${id}`),
  updateProfile: (body: Record<string, any>) =>
    request<{ success: true; data: any }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// ─── Matches ────────────────────────────────────────────────────────────────

export const matchApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return request<{ success: true; data: any[]; pagination: any }>(`/matches${qs}`);
  },
  create: (body: any) =>
    request<{ success: true; data: any }>('/matches', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getById: (id: string) => request<{ success: true; data: any }>(`/matches/${id}`),
  complete: (id: string, homeScore: number, awayScore: number) =>
    request<{ success: true; data: any }>(`/matches/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ homeScore, awayScore }),
    }),
  submitStats: (matchId: string, stats: any) =>
    request<{ success: true; data: any }>(`/matches/${matchId}/stats`, {
      method: 'POST',
      body: JSON.stringify(stats),
    }),
  confirmStat: (matchId: string, statId: string, confirmed: boolean) =>
    request<{ success: true }>(`/matches/${matchId}/stats/${statId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed }),
    }),
  respondInvitation: (matchId: string, status: 'ACCEPTED' | 'DECLINED') =>
    request<{ success: true; data: any }>(`/matches/${matchId}/invitation`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ─── Votes ──────────────────────────────────────────────────────────────────

export const voteApi = {
  cast: (matchId: string, body: { targetPlayerId: string; rating: number; isMvpVote: boolean }) =>
    request<{ success: true; data: any }>(`/votes/${matchId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  close: (matchId: string) =>
    request<{ success: true; data: any }>(`/votes/${matchId}/close`, { method: 'POST' }),
  getResults: (matchId: string) => request<{ success: true; data: any }>(`/votes/${matchId}`),
};

// ─── Clubs ──────────────────────────────────────────────────────────────────

export const clubApi = {
  list: () => request<{ success: true; data: any[] }>('/clubs'),
  getById: (id: string) => request<{ success: true; data: any }>(`/clubs/${id}`),
  create: (body: { name: string; description?: string; preferredFormation?: string }) =>
    request<{ success: true; data: any }>('/clubs', { method: 'POST', body: JSON.stringify(body) }),
  addMember: (clubId: string, userId: string, role?: string) =>
    request<{ success: true; data: any }>(`/clubs/${clubId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role: role || 'PLAYER' }),
    }),
};

// ─── Competitions ───────────────────────────────────────────────────────────

export const competitionApi = {
  create: (body: any) =>
    request<{ success: true; data: any }>('/competitions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  registerClub: (competitionId: string, clubId: string) =>
    request<{ success: true; data: any }>(`/competitions/${competitionId}/register`, {
      method: 'POST',
      body: JSON.stringify({ clubId }),
    }),
  generateCalendar: (competitionId: string) =>
    request<{ success: true }>(`/competitions/${competitionId}/generate-calendar`, {
      method: 'POST',
    }),
  getStandings: (competitionId: string) =>
    request<{ success: true; data: any[] }>(`/competitions/${competitionId}/standings`),
  getBrackets: (competitionId: string) =>
    request<{ success: true; data: any[] }>(`/competitions/${competitionId}/brackets`),
};

// ─── Rankings ───────────────────────────────────────────────────────────────

export const rankingApi = {
  get: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: true; data: any[] }>(`/rankings?${qs}`);
  },
};
