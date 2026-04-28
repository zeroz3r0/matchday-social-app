// ============================================================================
// BracketsTab — Tournament brackets for a competition
// ============================================================================
// Fetches competitionApi.getBrackets(id) and renders <BracketView/> with
// stage.name (per spec REQ-COMP-BR-1; design's `label` was incorrect).
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { competitionApi } from '../../services/api';
import { BracketView } from '../../components/BracketView';
import type { BracketStage, BracketMatch } from '../../components/BracketView';
import { C } from '../../utils/theme';

interface BracketsTabProps {
  competitionId: string;
}

// Defensive mapper — backend may return slightly different shapes.
function toBracketMatch(raw: unknown): BracketMatch | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const homeClubName = typeof r.homeClubName === 'string' ? r.homeClubName : null;
  const awayClubName = typeof r.awayClubName === 'string' ? r.awayClubName : null;
  if (homeClubName === null || awayClubName === null) return null;
  return {
    matchId: typeof r.matchId === 'string' ? r.matchId : null,
    homeClubName,
    awayClubName,
    homeScore: typeof r.homeScore === 'number' ? r.homeScore : null,
    awayScore: typeof r.awayScore === 'number' ? r.awayScore : null,
  };
}

function toBracketStage(raw: unknown): BracketStage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name : null;
  if (name === null) return null;
  const matches = Array.isArray(r.matches)
    ? r.matches.map((m) => toBracketMatch(m)).filter((m): m is BracketMatch => m !== null)
    : [];
  return { name, matches };
}

export function BracketsTab({ competitionId }: BracketsTabProps) {
  const [stages, setStages] = useState<BracketStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await competitionApi.getBrackets(competitionId);
        if (aborted) return;
        const mapped = result.data
          .map((item) => toBracketStage(item))
          .filter((stage): stage is BracketStage => stage !== null);
        setStages(mapped);
      } catch (err) {
        if (aborted) return;
        const message = err instanceof Error ? err.message : 'No se pudieron cargar las llaves';
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

  if (stages.length === 0) {
    return (
      <View style={[s.c, s.center, { paddingHorizontal: 24 }]}>
        <Ionicons name="git-branch-outline" size={56} color={C.t3} />
        <Text style={s.emptyT}>Aún no hay llaves generadas.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <BracketView stages={stages} />
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
