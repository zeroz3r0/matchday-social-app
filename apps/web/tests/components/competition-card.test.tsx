/**
 * RED — tests for `<CompetitionCard>`.
 *
 * Spec: REQ-WP-9 — list page MUST display per competition: name, type,
 * gameType, city. Spec WP-S2 verifies these names appear in SSR HTML.
 *
 * Behavior under test (RTL — happy-dom):
 *   - Renders the competition NAME prominently (h2).
 *   - Renders city, type label (Liga / Torneo), gameType (F5/F7/F11).
 *   - Wraps the card in a Next `<Link>` to `/competiciones/{id}` so
 *     clicking navigates to detail.
 *   - Spanish labels: "Liga" / "Torneo", "Madrid", etc.
 *   - Renders dates (start date) in a human Spanish format.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CompetitionCard } from '@/components/competition-card';
import type { CompetitionListItem } from '@/lib/types/competition';

const sampleLeague: CompetitionListItem = {
  id: 'cmp_1',
  name: 'Liga del Barrio Chamberí',
  type: 'LEAGUE',
  gameType: 'F7',
  description: null,
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-12-15T00:00:00.000Z',
  city: 'Madrid',
  latitude: 40.4,
  longitude: -3.7,
  createdById: 'usr_1',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

const sampleTournament: CompetitionListItem = {
  ...sampleLeague,
  id: 'cmp_2',
  name: 'Copa del Manzanares',
  type: 'TOURNAMENT',
  gameType: 'F11',
  city: 'Sevilla',
};

describe('<CompetitionCard>', () => {
  it('renders the competition name as a heading', () => {
    render(<CompetitionCard competition={sampleLeague} />);
    expect(screen.getByRole('heading', { name: 'Liga del Barrio Chamberí' })).toBeInTheDocument();
  });

  it('renders city + Spanish type label "Liga" + gameType for a LEAGUE', () => {
    render(<CompetitionCard competition={sampleLeague} />);
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    // Exact-match "Liga" to distinguish from heading "Liga del Barrio…".
    expect(screen.getByText('Liga', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('F7')).toBeInTheDocument();
  });

  it('renders Spanish type label "Torneo" + correct gameType for a TOURNAMENT', () => {
    render(<CompetitionCard competition={sampleTournament} />);
    expect(screen.getByText('Torneo', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('F11')).toBeInTheDocument();
    expect(screen.getByText('Sevilla')).toBeInTheDocument();
  });

  it('wraps the card content in a link to /competiciones/{id}', () => {
    render(<CompetitionCard competition={sampleLeague} />);
    const link = screen.getByRole('link', { name: /Liga del Barrio Chamberí/ });
    expect(link).toHaveAttribute('href', '/competiciones/cmp_1');
  });

  it('renders the start date in a Spanish-readable format (year visible)', () => {
    render(<CompetitionCard competition={sampleLeague} />);
    // Date is rendered with Intl 'es-ES' — exact format varies, but year MUST appear.
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});
