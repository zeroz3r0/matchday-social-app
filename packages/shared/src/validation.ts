// ============================================================================
// VALIDATION — Reglas de negocio compartidas
// ============================================================================

import {
  RATING_MIN,
  RATING_MAX,
  MAX_NICKNAME_LENGTH,
  MIN_NICKNAME_LENGTH,
  MAX_BIO_LENGTH,
  STAT_CONFIRMATION_THRESHOLD,
  LOCAL_RANKING_RADIUS_KM,
} from './constants';
import { GameType, MIN_SQUAD_SIZE } from '.';

// ─── Validation Result ──────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── User Validations ───────────────────────────────────────────────────────

export function validateNickname(nickname: string): ValidationResult {
  const errors: string[] = [];

  if (nickname.length < MIN_NICKNAME_LENGTH) {
    errors.push(`El nickname debe tener al menos ${MIN_NICKNAME_LENGTH} caracteres`);
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    errors.push(`El nickname no puede superar los ${MAX_NICKNAME_LENGTH} caracteres`);
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(nickname)) {
    errors.push('El nickname solo puede contener letras, numeros, puntos, guiones y guiones bajos');
  }

  return { valid: errors.length === 0, errors };
}

export function validateBio(bio: string): ValidationResult {
  const errors: string[] = [];
  if (bio.length > MAX_BIO_LENGTH) {
    errors.push(`La biografia no puede superar los ${MAX_BIO_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors };
}

// ─── Rating Validations ─────────────────────────────────────────────────────

export function validateRating(rating: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(rating)) {
    errors.push('La nota debe ser un numero entero');
  }
  if (rating < RATING_MIN || rating > RATING_MAX) {
    errors.push(`La nota debe estar entre ${RATING_MIN} y ${RATING_MAX}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Redondea la nota media a 1 decimal para la interfaz.
 * Ejemplo: 7.666... -> 7.7
 */
export function roundRating(avg: number): number {
  return Math.round(avg * 10) / 10;
}

// ─── Stat Validations ───────────────────────────────────────────────────────

export function validateStats(stats: {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}): ValidationResult {
  const errors: string[] = [];

  if (stats.goals < 0) errors.push('Los goles no pueden ser negativos');
  if (stats.assists < 0) errors.push('Las asistencias no pueden ser negativas');
  if (stats.yellowCards < 0 || stats.yellowCards > 2)
    errors.push('Las amarillas deben estar entre 0 y 2');
  if (stats.redCards < 0 || stats.redCards > 1) errors.push('Las rojas deben ser 0 o 1');

  return { valid: errors.length === 0, errors };
}

/**
 * Calcula cuantas confirmaciones se necesitan (50% de jugadores del partido)
 */
export function calculateRequiredConfirmations(totalPlayersInMatch: number): number {
  return Math.ceil(totalPlayersInMatch * STAT_CONFIRMATION_THRESHOLD);
}

// ─── Squad Validations ──────────────────────────────────────────────────────

export function validateSquadSize(gameType: GameType, squadSize: number): ValidationResult {
  const errors: string[] = [];
  const minSize = MIN_SQUAD_SIZE[gameType];

  if (squadSize < minSize) {
    errors.push(
      `El ${gameType} requiere un minimo de ${minSize} jugadores. Tienes ${squadSize}.`,
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Geo Validations ────────────────────────────────────────────────────────

/**
 * Calcula la distancia entre dos puntos usando la formula Haversine.
 * Devuelve la distancia en kilometros.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Comprueba si un punto esta dentro del radio local (50km)
 */
export function isWithinLocalRadius(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
): boolean {
  return haversineDistance(userLat, userLon, targetLat, targetLon) <= LOCAL_RANKING_RADIUS_KM;
}

// ─── MVP Algorithm ──────────────────────────────────────────────────────────

export interface MvpCandidate {
  playerId: string;
  teamId: string;
  mvpVotes: number;
  goals: number;
  assists: number;
  isWinningTeam: boolean;
}

/**
 * Algoritmo MVP — Desempate:
 * 1. Mayor numero de votos MVP
 * 2. En empate -> Prioridad al equipo ganador
 * 3. En empate -> Mayor goles + asistencias
 * 4. En empate -> Random
 */
export function resolveMvp(candidates: MvpCandidate[]): MvpCandidate {
  if (candidates.length === 0) {
    throw new Error('No hay candidatos para MVP');
  }

  const sorted = [...candidates].sort((a, b) => {
    // 1. Mayor votos MVP
    if (b.mvpVotes !== a.mvpVotes) return b.mvpVotes - a.mvpVotes;

    // 2. Equipo ganador tiene prioridad
    if (a.isWinningTeam !== b.isWinningTeam) return a.isWinningTeam ? -1 : 1;

    // 3. Mayor goles + asistencias
    const aContrib = a.goals + a.assists;
    const bContrib = b.goals + b.assists;
    if (bContrib !== aContrib) return bContrib - aContrib;

    // 4. Random
    return Math.random() - 0.5;
  });

  return sorted[0]!;
}
