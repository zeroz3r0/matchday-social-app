// ============================================================================
// DOMAIN TYPES — MatchDay Social
// ============================================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum GameType {
  F5 = 'F5',
  F7 = 'F7',
  F11 = 'F11',
}

export enum PlayerPosition {
  GOALKEEPER = 'GOALKEEPER',
  DEFENDER = 'DEFENDER',
  MIDFIELDER = 'MIDFIELDER',
  FORWARD = 'FORWARD',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum StatValidationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DISPUTED = 'DISPUTED',
  AUTO_CONFIRMED = 'AUTO_CONFIRMED',
}

export enum VotingWindowStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum CompetitionType {
  LEAGUE = 'LEAGUE',
  TOURNAMENT = 'TOURNAMENT',
}

export enum TournamentStage {
  ROUND_OF_64 = 'ROUND_OF_64',
  ROUND_OF_32 = 'ROUND_OF_32',
  ROUND_OF_16 = 'ROUND_OF_16',
  QUARTER_FINAL = 'QUARTER_FINAL',
  SEMI_FINAL = 'SEMI_FINAL',
  FINAL = 'FINAL',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export enum CardType {
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum RankingCategory {
  GOALS = 'GOALS',
  ASSISTS = 'ASSISTS',
  AVG_RATING = 'AVG_RATING',
  MVP_COUNT = 'MVP_COUNT',
}

export enum GeoScope {
  LOCAL = 'LOCAL', // 50km radius
  CITY = 'CITY',
  NATIONAL = 'NATIONAL',
}

// ─── User & Profile ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  position: PlayerPosition;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  medals: PlayerMedals;
  stats: AggregatedStats;
}

export interface PlayerMedals {
  mvpCount: number;
  totalGoals: number;
  totalAssists: number;
  totalYellowCards: number;
  totalRedCards: number;
  matchesPlayed: number;
}

export interface AggregatedStats {
  avgRating: number; // Redondeado a 1 decimal
  totalVotesReceived: number;
  winRate: number; // Porcentaje
}

// ─── Matches ────────────────────────────────────────────────────────────────

export interface Match {
  id: string;
  gameType: GameType;
  status: MatchStatus;
  location: MatchLocation;
  scheduledAt: Date;
  completedAt: Date | null;
  votingDeadline: Date | null; // scheduledAt + 12h
  createdById: string;
  competitionId: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contactPhone: string | null;
  googlePlaceId: string | null;
}

// ─── Teams (per-match rosters) ──────────────────────────────────────────────

export interface MatchTeam {
  id: string;
  matchId: string;
  clubId: string | null; // null = pickup game
  name: string;
  isHome: boolean;
}

export interface MatchPlayer {
  id: string;
  matchTeamId: string;
  userId: string;
  position: PlayerPosition;
  invitationStatus: InvitationStatus;
}

// ─── Stats & Validation ─────────────────────────────────────────────────────

export interface MatchStat {
  id: string;
  matchId: string;
  playerId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  submittedById: string;
  validationStatus: StatValidationStatus;
  confirmations: number;
  requiredConfirmations: number; // 50% de jugadores del partido
  autoConfirmAt: Date; // submittedAt + 24h
  createdAt: Date;
  updatedAt: Date;
}

export interface StatConfirmation {
  id: string;
  matchStatId: string;
  userId: string;
  confirmed: boolean;
  createdAt: Date;
}

// ─── Votes & MVP ────────────────────────────────────────────────────────────

export interface PlayerVote {
  id: string;
  matchId: string;
  voterId: string;
  targetPlayerId: string;
  rating: number; // 1-10, entero
  isMvpVote: boolean;
  createdAt: Date;
}

export interface MvpResult {
  id: string;
  matchId: string;
  homeTeamMvpId: string;
  awayTeamMvpId: string;
  globalMvpId: string;
  calculatedAt: Date;
}

// ─── Clubs ──────────────────────────────────────────────────────────────────

export interface Club {
  id: string;
  name: string;
  badgeUrl: string | null;
  description: string | null;
  preferredFormation: string | null; // e.g. "4-3-3", "2-2-1"
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: 'ADMIN' | 'CAPTAIN' | 'PLAYER';
  joinedAt: Date;
}

// ─── Competitions (Ligas & Torneos) ─────────────────────────────────────────

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  gameType: GameType;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  maxPostponeDays: number; // Default: 14 (2 semanas)
  createdById: string;
  latitude: number;
  longitude: number;
  city: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeagueStanding {
  id: string;
  competitionId: string;
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number; // +3 win, +1 draw, 0 loss
}

export interface TournamentBracket {
  id: string;
  competitionId: string;
  stage: TournamentStage;
  matchOrder: number;
  matchId: string | null;
  homeClubId: string | null;
  awayClubId: string | null;
  isBypass: boolean; // true = equipo pasa sin jugar (impares)
  winnerId: string | null;
}

// ─── Ladderboard / Rankings ─────────────────────────────────────────────────

export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  value: number; // Goles, asistencias o nota media (1 decimal)
  category: RankingCategory;
}

export interface RankingFilters {
  category: RankingCategory;
  scope: GeoScope;
  latitude?: number;
  longitude?: number;
  city?: string;
  gameType?: GameType;
  limit?: number;
  offset?: number;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface PushNotificationPayload {
  title: string;
  body: string;
  data: {
    type:
      | 'MATCH_INVITE'
      | 'VOTE_REMINDER'
      | 'MVP_RESULT'
      | 'STAT_VALIDATION'
      | 'MATCH_REMINDER'
      | 'COMPETITION_UPDATE';
    matchId?: string;
    competitionId?: string;
  };
}

// ─── API Responses ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
