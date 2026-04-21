// ============================================================================
// Mock API — Drop-in replacement for services/api.ts when EXPO_PUBLIC_USE_MOCK=true
// ============================================================================
// Same shape as api.ts — screens never know the difference.
// All responses wrapped in { success: true, data: ... } to match backend contract.
// Network latency simulated (150-300ms) for realistic feel.
// ============================================================================

import { mockDb, delay, mockId, currentUserId, type MockUser, type MockMatch } from './mockDb';

// ─── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (body: {
    email: string;
    password: string;
    nickname: string;
    position: string;
    bio?: string;
  }) => {
    await delay();
    // Si el nickname existe, usamos el existente. Si no, creamos uno nuevo.
    const existing = mockDb.users.find(
      (u) => u.nickname.toLowerCase() === body.nickname.toLowerCase(),
    );
    let user: MockUser;
    if (existing) {
      user = existing;
    } else {
      user = {
        id: mockId('u'),
        email: body.email,
        nickname: body.nickname,
        avatarUrl: null,
        position: body.position as MockUser['position'],
        bio: body.bio ?? null,
        city: 'Madrid',
        latitude: 40.4168,
        longitude: -3.7038,
        stats: { avgRating: 0, totalVotesReceived: 0 },
        medals: {
          totalGoals: 0,
          totalAssists: 0,
          mvpCount: 0,
          matchesPlayed: 0,
          totalYellowCards: 0,
          totalRedCards: 0,
        },
      };
      mockDb.users.push(user);
    }
    return { success: true as const, data: { user, token: `mock-token-${user.id}` } };
  },

  login: async (email: string, _password: string) => {
    await delay();
    // Mock: cualquier credencial loguea como currentUser.
    // Si el email coincide con un seed user, devolvemos ese; si no, currentUser.
    const byEmail = mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const user = byEmail ?? mockDb.currentUser;
    return { success: true as const, data: { user, token: `mock-token-${user.id}` } };
  },
};

// ─── Users ──────────────────────────────────────────────────────────────────

export const userApi = {
  getMe: async () => {
    await delay();
    return { success: true as const, data: mockDb.currentUser };
  },

  getProfile: async (id: string) => {
    await delay();
    const user = mockDb.getUser(id);
    if (!user) throw new MockApiError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
    return { success: true as const, data: user };
  },

  updateProfile: async (body: Record<string, any>) => {
    await delay();
    const user = mockDb.currentUser;
    Object.assign(user, body);
    return { success: true as const, data: user };
  },
};

// ─── Matches ────────────────────────────────────────────────────────────────

export const matchApi = {
  list: async (params?: { status?: string; limit?: number; offset?: number }) => {
    await delay();
    let items: MockMatch[] = [...mockDb.matches];
    if (params?.status) {
      items = items.filter((m) => m.status === params.status);
    }
    // Ordenar: IN_PROGRESS primero, luego SCHEDULED próximos, luego COMPLETED recientes
    items.sort((a, b) => {
      const order: Record<string, number> = {
        IN_PROGRESS: 0,
        SCHEDULED: 1,
        COMPLETED: 2,
        POSTPONED: 3,
        CANCELLED: 4,
      };
      const oa = order[a.status] ?? 9;
      const ob = order[b.status] ?? 9;
      if (oa !== ob) return oa - ob;
      return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    });

    const total = items.length;
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 50;
    const paged = items.slice(offset, offset + limit);
    return {
      success: true as const,
      data: paged,
      pagination: { total, limit, offset },
    };
  },

  create: async (body: any) => {
    await delay();
    const id = mockId('m');
    const homePlayerIds: string[] = body.homeTeam?.playerIds ?? [currentUserId];
    const awayPlayerIds: string[] = body.awayTeam?.playerIds ?? [];

    const match: MockMatch = {
      id,
      gameType: body.gameType ?? 'F7',
      status: 'SCHEDULED',
      scheduledAt: body.scheduledAt ?? new Date(Date.now() + 86400000).toISOString(),
      completedAt: null,
      votingDeadline: null,
      locationName: body.locationName ?? 'Sin definir',
      locationAddress: body.locationAddress ?? '',
      latitude: body.latitude ?? 40.4168,
      longitude: body.longitude ?? -3.7038,
      contactPhone: body.contactPhone ?? null,
      homeScore: null,
      awayScore: null,
      createdById: currentUserId,
      competitionId: body.competitionId ?? null,
      teams: [
        {
          id: `t_${id}_h`,
          matchId: id,
          clubId: body.homeTeam?.clubId ?? null,
          name: body.homeTeam?.name ?? 'Local',
          isHome: true,
          players: homePlayerIds.map((uid) => {
            const u = mockDb.getUser(uid);
            return {
              id: mockId('p'),
              userId: uid,
              invitationStatus: uid === currentUserId ? 'ACCEPTED' : 'PENDING',
              user: u
                ? { id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl }
                : { id: uid, nickname: 'Jugador', avatarUrl: null },
            };
          }),
        },
        {
          id: `t_${id}_a`,
          matchId: id,
          clubId: body.awayTeam?.clubId ?? null,
          name: body.awayTeam?.name ?? 'Visitante',
          isHome: false,
          players: awayPlayerIds.map((uid) => {
            const u = mockDb.getUser(uid);
            return {
              id: mockId('p'),
              userId: uid,
              invitationStatus: 'PENDING' as const,
              user: u
                ? { id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl }
                : { id: uid, nickname: 'Jugador', avatarUrl: null },
            };
          }),
        },
      ],
    };
    mockDb.matches.unshift(match);
    return { success: true as const, data: match };
  },

  getById: async (id: string) => {
    await delay();
    const match = mockDb.getMatch(id);
    if (!match) throw new MockApiError(404, 'MATCH_NOT_FOUND', 'Partido no encontrado');
    return { success: true as const, data: match };
  },

  complete: async (id: string, homeScore: number, awayScore: number) => {
    await delay();
    const match = mockDb.getMatch(id);
    if (!match) throw new MockApiError(404, 'MATCH_NOT_FOUND', 'Partido no encontrado');
    match.status = 'COMPLETED';
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.completedAt = new Date().toISOString();
    match.votingDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    return { success: true as const, data: match };
  },

  submitStats: async (matchId: string, stats: any) => {
    await delay();
    const id = mockId('s');
    mockDb.stats.push({
      id,
      matchId,
      playerId: stats.playerId ?? currentUserId,
      goals: stats.goals ?? 0,
      assists: stats.assists ?? 0,
      yellowCards: stats.yellowCards ?? 0,
      redCards: stats.redCards ?? 0,
      submittedById: currentUserId,
      validationStatus: 'PENDING',
      confirmationsCount: 0,
      requiredConfirmations: 3,
    });
    return { success: true as const, data: { id, status: 'PENDING' } };
  },

  confirmStat: async (_matchId: string, statId: string, confirmed: boolean) => {
    await delay();
    const stat = mockDb.stats.find((s) => s.id === statId);
    if (stat && confirmed) {
      stat.confirmationsCount += 1;
      if (stat.confirmationsCount >= stat.requiredConfirmations) {
        stat.validationStatus = 'CONFIRMED';
      }
    } else if (stat && !confirmed) {
      stat.validationStatus = 'DISPUTED';
    }
    return { success: true as const };
  },

  respondInvitation: async (matchId: string, status: 'ACCEPTED' | 'DECLINED') => {
    await delay();
    const match = mockDb.getMatch(matchId);
    if (!match) throw new MockApiError(404, 'MATCH_NOT_FOUND', 'Partido no encontrado');
    for (const team of match.teams) {
      const player = team.players.find((p) => p.userId === currentUserId);
      if (player) player.invitationStatus = status;
    }
    return { success: true as const, data: match };
  },
};

// ─── Votes ──────────────────────────────────────────────────────────────────

export const voteApi = {
  cast: async (
    matchId: string,
    body: { targetPlayerId: string; rating: number; isMvpVote: boolean },
  ) => {
    await delay(80, 150); // más rápido porque se envían en paralelo
    const existingIdx = mockDb.votes.findIndex(
      (v) =>
        v.matchId === matchId &&
        v.voterId === currentUserId &&
        v.targetPlayerId === body.targetPlayerId,
    );
    const vote = {
      id: existingIdx >= 0 ? mockDb.votes[existingIdx].id : mockId('v'),
      matchId,
      voterId: currentUserId,
      targetPlayerId: body.targetPlayerId,
      rating: body.rating,
      isMvpVote: body.isMvpVote,
    };
    if (existingIdx >= 0) {
      mockDb.votes[existingIdx] = vote;
    } else {
      mockDb.votes.push(vote);
    }
    return { success: true as const, data: vote };
  },

  close: async (matchId: string) => {
    await delay();
    const match = mockDb.getMatch(matchId);
    if (!match) throw new MockApiError(404, 'MATCH_NOT_FOUND', 'Partido no encontrado');
    // Contar votos MVP
    const mvpCounts = new Map<string, number>();
    mockDb.votes
      .filter((v) => v.matchId === matchId && v.isMvpVote)
      .forEach((v) => {
        mvpCounts.set(v.targetPlayerId, (mvpCounts.get(v.targetPlayerId) ?? 0) + 1);
      });
    let topId = '';
    let topCount = 0;
    mvpCounts.forEach((count, id) => {
      if (count > topCount) {
        topCount = count;
        topId = id;
      }
    });
    // Fallback: primer jugador
    if (!topId) {
      topId = match.teams[0]?.players[0]?.userId ?? currentUserId;
    }
    match.mvpResult = { globalMvpId: topId, homeTeamMvpId: topId, awayTeamMvpId: topId };
    match.votingDeadline = new Date().toISOString();
    return { success: true as const, data: match.mvpResult };
  },

  getResults: async (matchId: string) => {
    await delay();
    const match = mockDb.getMatch(matchId);
    const votes = mockDb.votes.filter((v) => v.matchId === matchId);
    return {
      success: true as const,
      data: { votes, mvpResult: match?.mvpResult ?? null },
    };
  },
};

// ─── Clubs ──────────────────────────────────────────────────────────────────

export const clubApi = {
  list: async () => {
    await delay();
    // Solo clubes donde currentUser es miembro
    const mine = mockDb.clubs.filter((c) => c.members.some((m) => m.userId === currentUserId));
    return { success: true as const, data: mine };
  },

  getById: async (id: string) => {
    await delay();
    const club = mockDb.getClub(id);
    if (!club) throw new MockApiError(404, 'CLUB_NOT_FOUND', 'Club no encontrado');
    return { success: true as const, data: club };
  },

  create: async (body: { name: string; description?: string; preferredFormation?: string }) => {
    await delay();
    const club = {
      id: mockId('c'),
      name: body.name,
      description: body.description ?? null,
      preferredFormation: (body.preferredFormation ?? null) as any,
      badgeUrl: null,
      createdById: currentUserId,
      members: [{ userId: currentUserId, role: 'ADMIN' as const }],
      _count: { members: 1 },
    };
    mockDb.clubs.push(club);
    return { success: true as const, data: club };
  },

  addMember: async (clubId: string, userId: string, role?: string) => {
    await delay();
    const club = mockDb.getClub(clubId);
    if (!club) throw new MockApiError(404, 'CLUB_NOT_FOUND', 'Club no encontrado');
    const exists = club.members.find((m) => m.userId === userId);
    if (!exists) {
      club.members.push({ userId, role: (role ?? 'PLAYER') as any });
      club._count.members = club.members.length;
    }
    return { success: true as const, data: club };
  },
};

// ─── Competitions ───────────────────────────────────────────────────────────

export const competitionApi = {
  create: async (body: any) => {
    await delay();
    return { success: true as const, data: { id: mockId('comp'), ...body } };
  },

  registerClub: async (competitionId: string, clubId: string) => {
    await delay();
    return { success: true as const, data: { competitionId, clubId } };
  },

  generateCalendar: async (_competitionId: string) => {
    await delay();
    return { success: true as const };
  },

  getStandings: async (_competitionId: string) => {
    await delay();
    return { success: true as const, data: [] };
  },

  getBrackets: async (_competitionId: string) => {
    await delay();
    return { success: true as const, data: [] };
  },
};

// ─── Rankings ───────────────────────────────────────────────────────────────

export const rankingApi = {
  get: async (params: Record<string, string>) => {
    await delay();
    const category = params.category ?? 'GOALS';
    const scope = params.scope ?? 'NATIONAL';

    let pool = [...mockDb.users];

    // Filtrar por scope (en mock geo es casi todos Madrid — simulamos)
    if (scope === 'CITY' && params.city) {
      pool = pool.filter((u) => u.city?.toLowerCase() === params.city.toLowerCase());
    }
    // LOCAL y NATIONAL — devolvemos todos

    const getValue = (u: MockUser): number => {
      switch (category) {
        case 'GOALS':
          return u.medals.totalGoals;
        case 'ASSISTS':
          return u.medals.totalAssists;
        case 'AVG_RATING':
          return u.stats.avgRating;
        case 'MVP_COUNT':
          return u.medals.mvpCount;
        default:
          return 0;
      }
    };

    const sorted = pool
      .map((u) => ({ user: u, value: getValue(u) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const data = sorted.map((x, i) => ({
      rank: i + 1,
      userId: x.user.id,
      nickname: x.user.nickname,
      avatarUrl: x.user.avatarUrl,
      position: x.user.position,
      city: x.user.city,
      value: x.value,
    }));

    return { success: true as const, data };
  },
};

// ─── Errors ─────────────────────────────────────────────────────────────────

export class MockApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
