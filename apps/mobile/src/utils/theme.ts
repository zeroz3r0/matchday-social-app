// ============================================================================
// Theme — Colors, images, and design tokens
// Inspired by FotMob, OneFootball, BeSoccer
// ============================================================================

export const COLORS = {
  // Backgrounds
  bg: '#05051a',
  card: '#0d1126',
  cardAlt: '#111633',
  surface: '#161b3d',

  // Primary
  primary: '#00e676',      // Electric green (like FotMob)
  primaryDim: '#00e67633',

  // Accents
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
  orange: '#ff8c00',
  red: '#ff3d57',
  redDim: '#ff3d5722',
  blue: '#4fc3f7',
  purple: '#b388ff',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#8892b0',
  textMuted: '#4a5280',
  textAccent: '#00e676',

  // Borders
  border: '#1a2048',
  borderLight: '#232a52',
};

// Free high-quality FOOTBALL images (verified Unsplash direct links)
export const IMAGES = {
  // Login — estadio lleno de noche
  stadiumNight: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
  // Profile — balones en césped
  stadiumGrass: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80',
  // Home — estadio iluminado desde arriba
  fieldTopDown: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80',
  // Clubs — niños jugando fútbol en equipo
  teamHuddle: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=600&q=80',
  // Rankings — jugador chutando
  trophy: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80',
  // Extra — campo de noche con focos
  fieldNight: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80',
  // Extra — bota pisando balón
  ballClose: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&q=80',
  // Extra — línea de césped
  grassLine: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=600&q=80',
};

export const GAME_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  F5: { bg: '#ff3d5722', text: '#ff3d57', label: 'Fútbol 5' },
  F7: { bg: '#ff8c0022', text: '#ff8c00', label: 'Fútbol 7' },
  F11: { bg: '#00e67622', text: '#00e676', label: 'Fútbol 11' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  SCHEDULED: { label: 'Programado', color: '#4fc3f7', bg: '#4fc3f722', icon: '📅' },
  IN_PROGRESS: { label: 'En juego', color: '#ff3d57', bg: '#ff3d5722', icon: '🔴' },
  COMPLETED: { label: 'Finalizado', color: '#00e676', bg: '#00e67622', icon: '✅' },
  CANCELLED: { label: 'Cancelado', color: '#8892b0', bg: '#8892b022', icon: '❌' },
  POSTPONED: { label: 'Aplazado', color: '#b388ff', bg: '#b388ff22', icon: '⏸' },
};
