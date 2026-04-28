import { describe, it, expect } from 'vitest';
import {
  createCompetitionSchema,
  registerClubSchema,
  listCompetitionsQuerySchema,
} from '../../schemas/competition';
import { MAX_COMPETITION_NAME_LENGTH } from '../../constants';

// ─── createCompetitionSchema ────────────────────────────────────────────────

const validCreatePayload = {
  name: 'Liga del Barrio',
  type: 'LEAGUE' as const,
  gameType: 'F7' as const,
  description: 'Una liga amistosa',
  startDate: '2026-05-01T18:00:00.000Z',
  endDate: '2026-09-01T18:00:00.000Z',
  latitude: -34.6037,
  longitude: -58.3816,
  city: 'Buenos Aires',
};

describe('createCompetitionSchema', () => {
  it('accepts valid payload', () => {
    const result = createCompetitionSchema.safeParse(validCreatePayload);
    expect(result.success).toBe(true);
  });

  it('accepts payload without optional description and endDate', () => {
    const { description: _d, endDate: _e, ...minimal } = validCreatePayload;
    const result = createCompetitionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = createCompetitionSchema.safeParse({ ...validCreatePayload, name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true);
    }
  });

  it('rejects name longer than MAX_COMPETITION_NAME_LENGTH', () => {
    const tooLong = 'a'.repeat(MAX_COMPETITION_NAME_LENGTH + 1);
    const result = createCompetitionSchema.safeParse({ ...validCreatePayload, name: tooLong });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true);
    }
  });

  it('rejects invalid type enum', () => {
    const result = createCompetitionSchema.safeParse({ ...validCreatePayload, type: 'FOO' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('type'))).toBe(true);
    }
  });

  it('rejects invalid gameType enum', () => {
    const result = createCompetitionSchema.safeParse({ ...validCreatePayload, gameType: 'F99' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('gameType'))).toBe(true);
    }
  });

  it('rejects missing required name', () => {
    const { name: _n, ...withoutName } = validCreatePayload;
    const result = createCompetitionSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true);
    }
  });
});

// ─── registerClubSchema ─────────────────────────────────────────────────────

describe('registerClubSchema', () => {
  it('accepts valid clubId', () => {
    const result = registerClubSchema.safeParse({ clubId: 'abc' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clubId).toBe('abc');
    }
  });

  it('rejects empty object', () => {
    const result = registerClubSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('clubId'))).toBe(true);
    }
  });

  it('rejects empty string clubId', () => {
    const result = registerClubSchema.safeParse({ clubId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('clubId'))).toBe(true);
    }
  });
});

// ─── listCompetitionsQuerySchema ────────────────────────────────────────────

describe('listCompetitionsQuerySchema', () => {
  it('defaults limit to 20 when no input', () => {
    const result = listCompetitionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string "15" to number 15', () => {
    const result = listCompetitionsQuerySchema.safeParse({ limit: '15' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(15);
    }
  });

  it('rejects limit=0', () => {
    const result = listCompetitionsQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('limit'))).toBe(true);
    }
  });

  it('rejects limit=101', () => {
    const result = listCompetitionsQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('limit'))).toBe(true);
    }
  });

  it('rejects non-numeric limit "abc"', () => {
    const result = listCompetitionsQuerySchema.safeParse({ limit: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('limit'))).toBe(true);
    }
  });

  it('rejects invalid type enum', () => {
    const result = listCompetitionsQuerySchema.safeParse({ type: 'FOO' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('type'))).toBe(true);
    }
  });

  it('allows all optional fields undefined', () => {
    const result = listCompetitionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBeUndefined();
      expect(result.data.type).toBeUndefined();
      expect(result.data.gameType).toBeUndefined();
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it('accepts full valid query with all filters', () => {
    const result = listCompetitionsQuerySchema.safeParse({
      city: 'Buenos Aires',
      type: 'LEAGUE',
      gameType: 'F7',
      limit: '50',
      cursor: 'abc123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe('Buenos Aires');
      expect(result.data.type).toBe('LEAGUE');
      expect(result.data.gameType).toBe('F7');
      expect(result.data.limit).toBe(50);
      expect(result.data.cursor).toBe('abc123');
    }
  });
});
