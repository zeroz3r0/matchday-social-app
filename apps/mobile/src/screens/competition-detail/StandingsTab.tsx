// ============================================================================
// StandingsTab — League standings table for a competition
// ============================================================================
// Fetches competitionApi.getStandings(id) and renders <StandingsTable/>.
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { competitionApi } from '../../services/api';
import { StandingsTable } from '../../components/StandingsTable';
import type { StandingRow } from '../../components/StandingsTable';
import { C } from '../../utils/theme';

interface StandingsTabProps {
  competitionId: string;
}

// Defensive mapper — backend may return slightly different shapes.
function toStandingRow(raw: unknown): StandingRow | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const clubId = typeof r.clubId === 'string' ? r.clubId : null;
  const clubName = typeof r.clubName === 'string' ? r.clubName : null;
  if (clubId === null || clubName === null) return null;
  return {
    rank: typeof r.rank === 'number' ? r.rank : 0,
    clubId,
    clubName,
    clubCrest: typeof r.clubCrest === 'string' ? r.clubCrest : null,
    played: typeof r.played === 'number' ? r.played : 0,
    won: typeof r.won === 'number' ? r.won : 0,
    drawn: typeof r.drawn === 'number' ? r.drawn : 0,
    lost: typeof r.lost === 'number' ? r.lost : 0,
    goalsFor: typeof r.goalsFor === 'number' ? r.goalsFor : 0,
    goalsAgainst: typeof r.goalsAgainst === 'number' ? r.goalsAgainst : 0,
    points: typeof r.points === 'number' ? r.points : 0,
  };
}

export function StandingsTab({ competitionId }: StandingsTabProps) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await competitionApi.getStandings(competitionId);
        if (aborted) return;
        const mapped = result.data
          .map((item) => toStandingRow(item))
          .filter((row): row is StandingRow => row !== null);
        setRows(mapped);
      } catch (err) {
        if (aborted) return;
        const message = err instanceof Error ? err.message : 'No se pudo cargar la tabla';
        setError(message);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [competitionId]);

  if (loading) {
    return (
      <View style={[s.c, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (error !== null) {
    return (
      <View style={[s.c, s.center, { paddingHorizontal: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.red} />
        <Text style={s.errorT}>{error}</Text>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={[s.c, s.center, { paddingHorizontal: 24 }]}>
        <Ionicons name="podium-outline" size={56} color={C.t3} />
        <Text style={s.emptyT}>Aún no hay partidos disputados.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <StandingsTable rows={rows} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  cc: { padding: 16, paddingBottom: 100 },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorT: { color: C.t1, fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptyT: {
    color: C.t1,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});
