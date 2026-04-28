// ============================================================================
// API Client — Fetch wrapper with auth
// ============================================================================
// Swappable: EXPO_PUBLIC_USE_MOCK=true replaces all calls with mockApi (offline).
// ============================================================================

import { getItem } from '../utils/storage';
import * as mock from './mockApi';
import type { ListCompetitionsQuery } from '@matchday/shared';
import { captureException } from '../lib/sentry';

// ─── Wire types — Competition (dates as ISO strings on the wire) ────────────

export interface WireCompetition {
  id: string;
  name: string;
  type: 'LEAGUE' | 'TOURNAMENT' | 'KNOCKOUT';
  gameType: 'F5' | 'F7' | 'F11';
  description: string | null;
  startDate: string; // ISO
  endDate: string | null; // ISO
  city: string;
  latitude: number;
  longitude: number;
  createdById: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface WireCompetitionCreator {
  id: string;
  nickname: string;
}

export interface WireCompetitionClubLink {
  club: {
    id: string;
    name: string;
    badgeUrl: string | null;
  };
}

export interface WireCompetitionDetail extends WireCompetition {
  createdBy: WireCompetitionCreator;
  clubs: WireCompetitionClubLink[];
}

export interface WireCompetitionListResponse {
  success: true;
  data: WireCompetition[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const USE_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK === 'true' || process.env.EXPO_PUBLIC_USE_MOCK === '1';

if (USE_MOCK && typeof console !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[matchday] Running in MOCK mode — no backend required');
}

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
  } catch (err) {
    captureException(err);
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

// ─── Real implementations (used when USE_MOCK = false) ──────────────────────

const realAuthApi = {
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

const realUserApi = {
  getMe: () => request<{ success: true; data: any }>('/users/me'),
  getProfile: (id: string) => request<{ success: true; data: any }>(`/users/${id}`),
  updateProfile: (body: Record<string, any>) =>
    request<{ success: true; data: any }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

const realMatchApi = {
  list: (params?: { status?: string; competitionId?: string; limit?: number; offset?: number }) => {
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

const realVoteApi = {
  cast: (matchId: string, body: { targetPlayerId: string; rating: number; isMvpVote: boolean }) =>
    request<{ success: true; data: any }>(`/votes/${matchId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  close: (matchId: string) =>
    request<{ success: true; data: any }>(`/votes/${matchId}/close`, { method: 'POST' }),
  getResults: (matchId: string) => request<{ success: true; data: any }>(`/votes/${matchId}`),
};

const realClubApi = {
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

const realCompetitionApi = {
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

  list: (params?: Partial<ListCompetitionsQuery>): Promise<WireCompetitionListResponse> => {
    const qs = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return request<WireCompetitionListResponse>(`/competitions${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string): Promise<{ success: true; data: WireCompetitionDetail }> =>
    request<{ success: true; data: WireCompetitionDetail }>(`/competitions/${id}`),
};

const realRankingApi = {
  get: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ success: true; data: any[] }>(`/rankings?${qs}`);
  },
};

// ─── Swappable exports ──────────────────────────────────────────────────────
// Tipados con `typeof real*` para preservar la inferencia en las screens.
// El mock hace cast a `any` en el ternario porque su shape es estructuralmente
// compatible pero los tipos internos (fechas ISO, Promise.resolve vs fetch) difieren.

export const authApi: typeof realAuthApi = USE_MOCK ? (mock.authApi as any) : realAuthApi;
export const userApi: typeof realUserApi = USE_MOCK ? (mock.userApi as any) : realUserApi;
export const matchApi: typeof realMatchApi = USE_MOCK ? (mock.matchApi as any) : realMatchApi;
export const voteApi: typeof realVoteApi = USE_MOCK ? (mock.voteApi as any) : realVoteApi;
export const clubApi: typeof realClubApi = USE_MOCK ? (mock.clubApi as any) : realClubApi;
export const competitionApi: typeof realCompetitionApi = USE_MOCK
  ? (mock.competitionApi as any)
  : realCompetitionApi;
export const rankingApi: typeof realRankingApi = USE_MOCK
  ? (mock.rankingApi as any)
  : realRankingApi;
