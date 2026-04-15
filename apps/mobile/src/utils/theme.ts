// ============================================================================
// Theme — Professional dark theme inspired by FotMob / OneFootball
// ============================================================================

export const C = {
  // Backgrounds (deep navy gradient feel)
  bg: '#0B0E1A',
  card: '#131829',
  cardHover: '#1A2035',
  surface: '#1E2540',
  elevated: '#252D4A',

  // Primary — vibrant green (action, success, primary CTA)
  primary: '#00DC82',
  primaryMuted: 'rgba(0,220,130,0.15)',
  primaryBorder: 'rgba(0,220,130,0.3)',

  // Accent colors (each section gets its own identity)
  gold: '#FFB800',
  goldMuted: 'rgba(255,184,0,0.15)',
  red: '#FF4757',
  redMuted: 'rgba(255,71,87,0.12)',
  blue: '#3B82F6',
  blueMuted: 'rgba(59,130,246,0.15)',
  purple: '#8B5CF6',
  purpleMuted: 'rgba(139,92,246,0.15)',
  orange: '#F97316',
  orangeMuted: 'rgba(249,115,22,0.15)',
  silver: '#94A3B8',
  bronze: '#C2855A',

  // Text
  w: '#FFFFFF',
  t1: '#E2E8F0',  // primary text
  t2: '#94A3B8',  // secondary
  t3: '#475569',  // muted/disabled
  t4: '#334155',  // very muted

  // Borders
  border: '#1E293B',
  borderLight: '#334155',
};

// Real football images — all verified
export const IMG = {
  stadium: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80',
  field: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=900&q=80',
  grass: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=900&q=80',
  players: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=900&q=80',
  kick: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=900&q=80',
  night: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=900&q=80',
};

export const GAME_COLORS: Record<string, { accent: string; bg: string; label: string }> = {
  F5: { accent: '#FF4757', bg: 'rgba(255,71,87,0.12)', label: 'Fútbol Sala' },
  F7: { accent: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'Fútbol 7' },
  F11: { accent: '#00DC82', bg: 'rgba(0,220,130,0.12)', label: 'Fútbol 11' },
};

export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Programado', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  IN_PROGRESS: { label: 'En juego', color: '#FF4757', bg: 'rgba(255,71,87,0.12)' },
  COMPLETED: { label: 'Finalizado', color: '#00DC82', bg: 'rgba(0,220,130,0.12)' },
  CANCELLED: { label: 'Cancelado', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  POSTPONED: { label: 'Aplazado', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};
