import { describe, it, expect } from 'vitest';
import {
  validateNickname,
  validateBio,
  validateRating,
  validateStats,
  validateSquadSize,
  calculateRequiredConfirmations,
  roundRating,
  haversineDistance,
  isWithinLocalRadius,
  resolveMvp,
  MvpCandidate,
} from '../validation';
import { GameType } from '../types';

// ─── Nickname Validation ────────────────────────────────────────────────────

describe('validateNickname', () => {
  it('accepts valid nickname', () => {
    expect(validateNickname('Carlos_99').valid).toBe(true);
    expect(validateNickname('abc').valid).toBe(true);
    expect(validateNickname('user.name-test').valid).toBe(true);
  });

  it('rejects too short', () => {
    const r = validateNickname('ab');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('3');
  });

  it('rejects too long', () => {
    const r = validateNickname('a'.repeat(25));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('24');
  });

  it('rejects spaces', () => {
    expect(validateNickname('has space').valid).toBe(false);
  });

  it('rejects special chars', () => {
    expect(validateNickname('user@name').valid).toBe(false);
    expect(validateNickname('user!').valid).toBe(false);
  });
});

// ─── Bio Validation ─────────────────────────────────────────────────────────

describe('validateBio', () => {
  it('accepts valid bio', () => {
    expect(validateBio('Delantero nato').valid).toBe(true);
  });

  it('accepts empty bio', () => {
    expect(validateBio('').valid).toBe(true);
  });

  it('rejects too long', () => {
    const r = validateBio('x'.repeat(281));
    expect(r.valid).toBe(false);
  });

  it('accepts exactly 280', () => {
    expect(validateBio('x'.repeat(280)).valid).toBe(true);
  });
});

// ─── Rating Validation ──────────────────────────────────────────────────────

describe('validateRating', () => {
  it('accepts 1-10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateRating(i).valid).toBe(true);
    }
  });

  it('rejects 0', () => {
    expect(validateRating(0).valid).toBe(false);
  });

  it('rejects 11', () => {
    expect(validateRating(11).valid).toBe(false);
  });

  it('rejects decimals', () => {
    expect(validateRating(5.5).valid).toBe(false);
  });

  it('rejects negative', () => {
    expect(validateRating(-1).valid).toBe(false);
  });
});

// ─── Stats Validation ───────────────────────────────────────────────────────

describe('validateStats', () => {
  it('accepts valid stats', () => {
    expect(validateStats({ goals: 2, assists: 1, yellowCards: 1, redCards: 0 }).valid).toBe(true);
  });

  it('accepts zeros', () => {
    expect(validateStats({ goals: 0, assists: 0, yellowCards: 0, redCards: 0 }).valid).toBe(true);
  });

  it('rejects negative goals', () => {
    expect(validateStats({ goals: -1, assists: 0, yellowCards: 0, redCards: 0 }).valid).toBe(false);
  });

  it('rejects 3 yellow cards', () => {
    expect(validateStats({ goals: 0, assists: 0, yellowCards: 3, redCards: 0 }).valid).toBe(false);
  });

  it('rejects 2 red cards', () => {
    expect(validateStats({ goals: 0, assists: 0, yellowCards: 0, redCards: 2 }).valid).toBe(false);
  });
});

// ─── Squad Size ─────────────────────────────────────────────────────────────

describe('validateSquadSize', () => {
  it('F5 needs 5', () => {
    expect(validateSquadSize(GameType.F5, 5).valid).toBe(true);
    expect(validateSquadSize(GameType.F5, 4).valid).toBe(false);
  });

  it('F7 needs 7', () => {
    expect(validateSquadSize(GameType.F7, 7).valid).toBe(true);
    expect(validateSquadSize(GameType.F7, 6).valid).toBe(false);
  });

  it('F11 needs 11', () => {
    expect(validateSquadSize(GameType.F11, 11).valid).toBe(true);
    expect(validateSquadSize(GameType.F11, 10).valid).toBe(false);
  });
});

// ─── Confirmations ──────────────────────────────────────────────────────────

describe('calculateRequiredConfirmations', () => {
  it('50% of 10 = 5', () => {
    expect(calculateRequiredConfirmations(10)).toBe(5);
  });

  it('50% of 7 = 4 (ceil)', () => {
    expect(calculateRequiredConfirmations(7)).toBe(4);
  });

  it('50% of 1 = 1', () => {
    expect(calculateRequiredConfirmations(1)).toBe(1);
  });
});

// ─── Round Rating ───────────────────────────────────────────────────────────

describe('roundRating', () => {
  it('rounds to 1 decimal', () => {
    expect(roundRating(7.666)).toBe(7.7);
    expect(roundRating(8.0)).toBe(8);
    expect(roundRating(5.55)).toBe(5.6);
    expect(roundRating(3.14159)).toBe(3.1);
  });
});

// ─── Haversine Distance ─────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('Madrid to Barcelona ~500km', () => {
    const d = haversineDistance(40.4168, -3.7038, 41.3851, 2.1734);
    expect(d).toBeGreaterThan(450);
    expect(d).toBeLessThan(650);
  });

  it('same point = 0', () => {
    expect(haversineDistance(40, -3, 40, -3)).toBe(0);
  });
});

describe('isWithinLocalRadius', () => {
  it('same city = true', () => {
    // Two points in Madrid, ~5km apart
    expect(isWithinLocalRadius(40.4168, -3.7038, 40.45, -3.68)).toBe(true);
  });

  it('Madrid to Barcelona = false (>50km)', () => {
    expect(isWithinLocalRadius(40.4168, -3.7038, 41.3851, 2.1734)).toBe(false);
  });
});

// ─── MVP Algorithm ──────────────────────────────────────────────────────────

describe('resolveMvp', () => {
  const base: MvpCandidate = {
    playerId: '',
    teamId: 'team1',
    mvpVotes: 0,
    goals: 0,
    assists: 0,
    isWinningTeam: false,
  };

  it('picks player with most MVP votes', () => {
    const candidates: MvpCandidate[] = [
      { ...base, playerId: 'p1', mvpVotes: 5 },
      { ...base, playerId: 'p2', mvpVotes: 3 },
      { ...base, playerId: 'p3', mvpVotes: 1 },
    ];
    expect(resolveMvp(candidates).playerId).toBe('p1');
  });

  it('tiebreak: winning team wins', () => {
    const candidates: MvpCandidate[] = [
      { ...base, playerId: 'p1', mvpVotes: 3, isWinningTeam: false },
      { ...base, playerId: 'p2', mvpVotes: 3, isWinningTeam: true },
    ];
    expect(resolveMvp(candidates).playerId).toBe('p2');
  });

  it('tiebreak: goals+assists after winning team', () => {
    const candidates: MvpCandidate[] = [
      { ...base, playerId: 'p1', mvpVotes: 3, isWinningTeam: true, goals: 1, assists: 0 },
      { ...base, playerId: 'p2', mvpVotes: 3, isWinningTeam: true, goals: 2, assists: 1 },
    ];
    expect(resolveMvp(candidates).playerId).toBe('p2');
  });

  it('throws on empty candidates', () => {
    expect(() => resolveMvp([])).toThrow('No hay candidatos');
  });

  it('single candidate wins', () => {
    const candidates: MvpCandidate[] = [
      { ...base, playerId: 'solo' },
    ];
    expect(resolveMvp(candidates).playerId).toBe('solo');
  });
});
