// ============================================================================
// CONSTANTS — MatchDay Social
// ============================================================================

import { GameType } from './types';

/** Ventana de votacion tras finalizar partido (en horas) */
export const VOTING_WINDOW_HOURS = 12;

/** Tiempo para auto-confirmar estadisticas sin objeciones (en horas) */
export const STAT_AUTO_CONFIRM_HOURS = 24;

/** Porcentaje de jugadores necesarios para confirmar stats */
export const STAT_CONFIRMATION_THRESHOLD = 0.5; // 50%

/** Rango maximo de rating en votacion */
export const RATING_MIN = 1;
export const RATING_MAX = 10;

/** Radio para ranking local en km */
export const LOCAL_RANKING_RADIUS_KM = 50;

/** Maximo de dias de aplazamiento para partidos de competicion */
export const MAX_POSTPONE_DAYS = 14;

/** Puntos del sistema de liga */
export const LEAGUE_POINTS = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
} as const;

/** Plantilla minima requerida por tipo de juego */
export const MIN_SQUAD_SIZE: Record<GameType, number> = {
  [GameType.F5]: 5,
  [GameType.F7]: 7,
  [GameType.F11]: 11,
};

/** Plantilla maxima permitida por tipo de juego (incluye suplentes) */
export const MAX_SQUAD_SIZE: Record<GameType, number> = {
  [GameType.F5]: 8,
  [GameType.F7]: 10,
  [GameType.F11]: 16,
};

/** Avatares por defecto */
export const DEFAULT_AVATAR_URL = '/assets/default-avatar.png';
export const DEFAULT_BADGE_URL = '/assets/default-badge.png';

/** Longitud maxima de campos de texto */
export const MAX_NICKNAME_LENGTH = 24;
export const MIN_NICKNAME_LENGTH = 3;
export const MAX_BIO_LENGTH = 280;
export const MAX_CLUB_NAME_LENGTH = 40;
export const MAX_COMPETITION_NAME_LENGTH = 60;

/** Limites de paginacion */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Coordenadas de Espana como referencia (centro aproximado) */
export const SPAIN_CENTER = {
  latitude: 40.4168,
  longitude: -3.7038,
} as const;

/** Formaciones por defecto segun tipo de juego */
export const DEFAULT_FORMATIONS: Record<GameType, string[]> = {
  [GameType.F5]: ['1-2-2', '2-1-2', '1-3-1', '2-2-1'],
  [GameType.F7]: ['1-3-2-1', '1-2-3-1', '1-3-1-2', '1-2-2-2'],
  [GameType.F11]: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3'],
};
