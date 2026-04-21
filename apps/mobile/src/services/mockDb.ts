// ============================================================================
// Mock DB — In-memory seed data for OFFLINE dev mode
// ============================================================================
// No backend, no network. Everything mutates this file's state.
// Session-only — reloading the app resets to seed.
// ============================================================================

export type Position = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
export type GameType = 'F5' | 'F7' | 'F11';
export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface MockUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  position: Position;
  bio: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  stats: {
    avgRating: number;
    totalVotesReceived: number;
  };
  medals: {
    totalGoals: number;
    totalAssists: number;
    mvpCount: number;
    matchesPlayed: number;
    totalYellowCards: number;
    totalRedCards: number;
  };
}

export interface MockClub {
  id: string;
  name: string;
  description: string | null;
  preferredFormation: GameType | null;
  badgeUrl: string | null;
  createdById: string;
  members: { userId: string; role: 'ADMIN' | 'CAPTAIN' | 'PLAYER' }[];
  _count: { members: number };
}

export interface MockPlayer {
  id: string;
  userId: string;
  invitationStatus: InvitationStatus;
  user: { id: string; nickname: string; avatarUrl: string | null };
}

export interface MockTeam {
  id: string;
  matchId: string;
  clubId: string | null;
  name: string;
  isHome: boolean;
  players: MockPlayer[];
}

export interface MockMatch {
  id: string;
  gameType: GameType;
  status: MatchStatus;
  scheduledAt: string;
  completedAt: string | null;
  votingDeadline: string | null;
  locationName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  contactPhone: string | null;
  homeScore: number | null;
  awayScore: number | null;
  createdById: string;
  competitionId: string | null;
  teams: MockTeam[];
  mvpResult?: { globalMvpId: string; homeTeamMvpId: string; awayTeamMvpId: string } | null;
}

export interface MockVote {
  id: string;
  matchId: string;
  voterId: string;
  targetPlayerId: string;
  rating: number;
  isMvpVote: boolean;
}

export interface MockStat {
  id: string;
  matchId: string;
  playerId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  submittedById: string;
  validationStatus: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'AUTO_CONFIRMED';
  confirmationsCount: number;
  requiredConfirmations: number;
}

// ─── Seed helpers ───────────────────────────────────────────────────────────

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function iso(offsetMs: number): string {
  return new Date(now + offsetMs).toISOString();
}

// ─── Seed: Users ────────────────────────────────────────────────────────────

export const currentUserId = 'u1';

const users: MockUser[] = [
  {
    id: 'u1',
    email: 'lionel@matchday.app',
    nickname: 'lionel10',
    avatarUrl: null,
    position: 'MIDFIELDER',
    bio: 'Mediapunta con pegada. Tiro libre es mi firma.',
    city: 'Madrid',
    latitude: 40.4168,
    longitude: -3.7038,
    stats: { avgRating: 8.3, totalVotesReceived: 34 },
    medals: {
      totalGoals: 12,
      totalAssists: 8,
      mvpCount: 3,
      matchesPlayed: 15,
      totalYellowCards: 2,
      totalRedCards: 0,
    },
  },
  {
    id: 'u2',
    email: 'dibu@matchday.app',
    nickname: 'dibu_arquero',
    avatarUrl: null,
    position: 'GOALKEEPER',
    bio: 'Debajo de los tres palos desde los 8 años.',
    city: 'Madrid',
    latitude: 40.4168,
    longitude: -3.7038,
    stats: { avgRating: 7.9, totalVotesReceived: 28 },
    medals: {
      totalGoals: 0,
      totalAssists: 1,
      mvpCount: 2,
      matchesPlayed: 14,
      totalYellowCards: 1,
      totalRedCards: 0,
    },
  },
  {
    id: 'u3',
    email: 'enzo@matchday.app',
    nickname: 'enzo5',
    avatarUrl: null,
    position: 'MIDFIELDER',
    bio: 'Volante central, cerebro del medio.',
    city: 'Madrid',
    latitude: 40.42,
    longitude: -3.7,
    stats: { avgRating: 8.6, totalVotesReceived: 31 },
    medals: {
      totalGoals: 5,
      totalAssists: 14,
      mvpCount: 4,
      matchesPlayed: 15,
      totalYellowCards: 3,
      totalRedCards: 0,
    },
  },
  {
    id: 'u4',
    email: 'juli@matchday.app',
    nickname: 'julicruz9',
    avatarUrl: null,
    position: 'FORWARD',
    bio: 'Goles, rebotes y segundo palo.',
    city: 'Madrid',
    latitude: 40.41,
    longitude: -3.71,
    stats: { avgRating: 8.9, totalVotesReceived: 36 },
    medals: {
      totalGoals: 22,
      totalAssists: 5,
      mvpCount: 5,
      matchesPlayed: 15,
      totalYellowCards: 1,
      totalRedCards: 1,
    },
  },
  {
    id: 'u5',
    email: 'cuti@matchday.app',
    nickname: 'cuti_muralla',
    avatarUrl: null,
    position: 'DEFENDER',
    bio: 'Cabeceo y marca al hombre. No pasa nadie.',
    city: 'Madrid',
    latitude: 40.415,
    longitude: -3.705,
    stats: { avgRating: 7.6, totalVotesReceived: 25 },
    medals: {
      totalGoals: 2,
      totalAssists: 1,
      mvpCount: 1,
      matchesPlayed: 14,
      totalYellowCards: 5,
      totalRedCards: 1,
    },
  },
  {
    id: 'u6',
    email: 'nacho@matchday.app',
    nickname: 'nachotoro',
    avatarUrl: null,
    position: 'DEFENDER',
    bio: 'Lateral por izquierda. Sube y baja.',
    city: 'Madrid',
    latitude: 40.418,
    longitude: -3.702,
    stats: { avgRating: 7.4, totalVotesReceived: 22 },
    medals: {
      totalGoals: 1,
      totalAssists: 4,
      mvpCount: 0,
      matchesPlayed: 13,
      totalYellowCards: 3,
      totalRedCards: 0,
    },
  },
  {
    id: 'u7',
    email: 'pepe@matchday.app',
    nickname: 'pepemago',
    avatarUrl: null,
    position: 'MIDFIELDER',
    bio: 'Gambeta en espacios reducidos.',
    city: 'Madrid',
    latitude: 40.417,
    longitude: -3.704,
    stats: { avgRating: 8.1, totalVotesReceived: 27 },
    medals: {
      totalGoals: 6,
      totalAssists: 9,
      mvpCount: 2,
      matchesPlayed: 14,
      totalYellowCards: 2,
      totalRedCards: 0,
    },
  },
  {
    id: 'u8',
    email: 'alvaro@matchday.app',
    nickname: 'alvarobombero',
    avatarUrl: null,
    position: 'FORWARD',
    bio: 'Delantero centro clásico.',
    city: 'Madrid',
    latitude: 40.413,
    longitude: -3.708,
    stats: { avgRating: 7.8, totalVotesReceived: 24 },
    medals: {
      totalGoals: 15,
      totalAssists: 3,
      mvpCount: 2,
      matchesPlayed: 14,
      totalYellowCards: 2,
      totalRedCards: 0,
    },
  },
];

// ─── Seed: Clubs ────────────────────────────────────────────────────────────

const clubs: MockClub[] = [
  {
    id: 'c1',
    name: 'Los Albirrojos del Barrio',
    description: 'Equipo del barrio, tres campeonatos locales.',
    preferredFormation: 'F7',
    badgeUrl: null,
    createdById: 'u1',
    members: [
      { userId: 'u1', role: 'ADMIN' },
      { userId: 'u2', role: 'CAPTAIN' },
      { userId: 'u5', role: 'PLAYER' },
      { userId: 'u6', role: 'PLAYER' },
      { userId: 'u7', role: 'PLAYER' },
    ],
    _count: { members: 5 },
  },
  {
    id: 'c2',
    name: 'Panaderos FC',
    description: 'Fundado en 2012. Tradición y pan caliente.',
    preferredFormation: 'F11',
    badgeUrl: null,
    createdById: 'u3',
    members: [
      { userId: 'u3', role: 'ADMIN' },
      { userId: 'u4', role: 'CAPTAIN' },
      { userId: 'u8', role: 'PLAYER' },
      { userId: 'u1', role: 'PLAYER' },
    ],
    _count: { members: 4 },
  },
  {
    id: 'c3',
    name: 'Veteranos del 88',
    description: 'Mezcla de viejos y nuevos. Sábados a la mañana.',
    preferredFormation: 'F7',
    badgeUrl: null,
    createdById: 'u5',
    members: [
      { userId: 'u5', role: 'ADMIN' },
      { userId: 'u1', role: 'PLAYER' },
    ],
    _count: { members: 2 },
  },
];

// ─── Seed helpers: build matches with teams/players ─────────────────────────

function mkPlayer(userId: string, invitationStatus: InvitationStatus = 'ACCEPTED'): MockPlayer {
  const u = users.find((x) => x.id === userId)!;
  return {
    id: `p_${userId}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    invitationStatus,
    user: { id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl },
  };
}

function mkTeam(
  matchId: string,
  isHome: boolean,
  name: string,
  clubId: string | null,
  playerIds: string[],
  pendingIds: string[] = [],
  declinedIds: string[] = [],
): MockTeam {
  return {
    id: `t_${matchId}_${isHome ? 'h' : 'a'}`,
    matchId,
    clubId,
    name,
    isHome,
    players: [
      ...playerIds.map((id) => mkPlayer(id, 'ACCEPTED')),
      ...pendingIds.map((id) => mkPlayer(id, 'PENDING')),
      ...declinedIds.map((id) => mkPlayer(id, 'DECLINED')),
    ],
  };
}

// ─── Seed: Matches ──────────────────────────────────────────────────────────

const matches: MockMatch[] = [];

// m1 — SCHEDULED F7, próximo sábado
{
  const id = 'm1';
  matches.push({
    id,
    gameType: 'F7',
    status: 'SCHEDULED',
    scheduledAt: iso(3 * DAY + 3 * HOUR),
    completedAt: null,
    votingDeadline: null,
    locationName: 'Polideportivo La Cueva',
    locationAddress: 'Calle del Arroyo 14, Madrid',
    latitude: 40.418,
    longitude: -3.702,
    contactPhone: '+34 600 123 456',
    homeScore: null,
    awayScore: null,
    createdById: 'u1',
    competitionId: null,
    teams: [
      mkTeam(id, true, 'Los Albirrojos', 'c1', ['u1', 'u2', 'u5', 'u6'], ['u7']),
      mkTeam(id, false, 'Panaderos FC', 'c2', ['u3', 'u4', 'u8'], ['u1']),
    ],
  });
}

// m2 — SCHEDULED F5, próximo martes, u1 está PENDING (test botón aceptar)
{
  const id = 'm2';
  matches.push({
    id,
    gameType: 'F5',
    status: 'SCHEDULED',
    scheduledAt: iso(1 * DAY + 2 * HOUR),
    completedAt: null,
    votingDeadline: null,
    locationName: 'Club Fútbol 5 Chamberí',
    locationAddress: 'Calle Fuencarral 120, Madrid',
    latitude: 40.43,
    longitude: -3.7,
    contactPhone: '+34 611 222 333',
    homeScore: null,
    awayScore: null,
    createdById: 'u4',
    competitionId: null,
    teams: [
      mkTeam(id, true, 'Equipo Viernes', null, ['u4', 'u3'], ['u1']),
      mkTeam(id, false, 'Los Tardones', null, ['u7', 'u8', 'u5']),
    ],
  });
}

// m3 — COMPLETED F7 hace 2 días, 4-3, votación YA CERRADA, MVP calculado
{
  const id = 'm3';
  const completedAt = iso(-2 * DAY);
  matches.push({
    id,
    gameType: 'F7',
    status: 'COMPLETED',
    scheduledAt: iso(-2 * DAY - 2 * HOUR),
    completedAt,
    votingDeadline: iso(-2 * DAY + 12 * HOUR),
    locationName: 'Campo Municipal Norte',
    locationAddress: 'Avenida de la Ilustración 50, Madrid',
    latitude: 40.48,
    longitude: -3.69,
    contactPhone: null,
    homeScore: 4,
    awayScore: 3,
    createdById: 'u1',
    competitionId: null,
    teams: [
      mkTeam(id, true, 'Los Albirrojos', 'c1', ['u1', 'u2', 'u5', 'u6', 'u7']),
      mkTeam(id, false, 'Rivales del Este', null, ['u3', 'u4', 'u8']),
    ],
    mvpResult: { globalMvpId: 'u1', homeTeamMvpId: 'u1', awayTeamMvpId: 'u4' },
  });
}

// m4 — COMPLETED F11 hace 1 día, 2-1, votación ABIERTA (vence en ~4h)
{
  const id = 'm4';
  const completedAt = iso(-12 * HOUR);
  matches.push({
    id,
    gameType: 'F11',
    status: 'COMPLETED',
    scheduledAt: iso(-1 * DAY - 2 * HOUR),
    completedAt,
    votingDeadline: iso(4 * HOUR),
    locationName: 'Estadio Municipal Sur',
    locationAddress: 'Paseo de la Chopera 10, Madrid',
    latitude: 40.39,
    longitude: -3.69,
    contactPhone: '+34 622 111 999',
    homeScore: 2,
    awayScore: 1,
    createdById: 'u3',
    competitionId: null,
    teams: [
      mkTeam(id, true, 'Panaderos FC', 'c2', ['u3', 'u4', 'u8', 'u1']),
      mkTeam(id, false, 'Bar Los Pinos', null, ['u2', 'u5', 'u6', 'u7']),
    ],
    mvpResult: null,
  });
}

// m5 — COMPLETED F7 hace 1 semana, 1-5 (derrota), stats confirmadas
{
  const id = 'm5';
  const completedAt = iso(-7 * DAY);
  matches.push({
    id,
    gameType: 'F7',
    status: 'COMPLETED',
    scheduledAt: iso(-7 * DAY - 2 * HOUR),
    completedAt,
    votingDeadline: iso(-7 * DAY + 12 * HOUR),
    locationName: 'Campo de Tierra El Ejido',
    locationAddress: 'Calle Real 200, Madrid',
    latitude: 40.42,
    longitude: -3.68,
    contactPhone: null,
    homeScore: 1,
    awayScore: 5,
    createdById: 'u1',
    competitionId: null,
    teams: [
      mkTeam(id, true, 'Los Albirrojos', 'c1', ['u1', 'u5', 'u6', 'u7']),
      mkTeam(id, false, 'Tsunami FC', null, ['u3', 'u4', 'u8']),
    ],
    mvpResult: { globalMvpId: 'u4', homeTeamMvpId: 'u5', awayTeamMvpId: 'u4' },
  });
}

// m6 — IN_PROGRESS F5 hoy, sin marcador
{
  const id = 'm6';
  matches.push({
    id,
    gameType: 'F5',
    status: 'IN_PROGRESS',
    scheduledAt: iso(-30 * 60 * 1000),
    completedAt: null,
    votingDeadline: null,
    locationName: 'Indoor Center Madrid',
    locationAddress: 'Calle Orense 85, Madrid',
    latitude: 40.46,
    longitude: -3.69,
    contactPhone: null,
    homeScore: null,
    awayScore: null,
    createdById: 'u4',
    competitionId: null,
    teams: [
      mkTeam(id, true, 'Café Madrid', null, ['u4', 'u3', 'u8']),
      mkTeam(id, false, 'Los Rapidos', null, ['u1', 'u7', 'u6']),
    ],
  });
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const mockDb = {
  users,
  clubs,
  matches,
  votes: [] as MockVote[],
  stats: [] as MockStat[],

  // Mutable getters
  getUser: (id: string) => users.find((u) => u.id === id),
  getClub: (id: string) => clubs.find((c) => c.id === id),
  getMatch: (id: string) => matches.find((m) => m.id === id),

  // Current user helper
  get currentUser(): MockUser {
    return users.find((u) => u.id === currentUserId)!;
  },
};

// Utility for latency simulation
export function delay(min = 150, max = 300): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(r, ms));
}

// Utility for mock IDs
let _idCounter = 1000;
export function mockId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}
