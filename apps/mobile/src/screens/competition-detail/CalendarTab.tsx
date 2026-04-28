// ============================================================================
// CalendarTab — Matches scheduled in this competition, grouped by date
// ============================================================================
// Fetches matchApi.list({ competitionId }) (widened in Batch 1) + applies a
// defensive client-side filter (real backend currently strips competitionId
// query param — TODO drop client filter when backend honors it). Groups by
// ISO date prefix and renders SectionList. Tap → MatchDetail screen.
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { matchApi } from '../../services/api';
import { C, GAME_COLORS, STATUS } from '../../utils/theme';

interface CalendarNav {
  navigate: (route: string, params?: { matchId: string }) => void;
}

interface CalendarTabProps {
  competitionId: string;
  navigation: CalendarNav;
}

interface MatchItem {
  id: string;
  gameType: string;
  status: string;
  scheduledAt: string;
  competitionId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  locationName: string;
  teams: { isHome: boolean; name: string }[];
}

interface MatchSection {
  title: string;
  data: MatchItem[];
}

function groupByDate(matches: MatchItem[]): MatchSection[] {
  const groups = new Map<string, MatchItem[]>();
  for (const m of matches) {
    const key = m.scheduledAt.split('T')[0] ?? m.scheduledAt;
    const list = groups.get(key);
    if (list === undefined) {
      groups.set(key, [m]);
    } else {
      list.push(m);
    }
  }

  const sections: MatchSection[] = [];
  // Sort keys ascending (chronological).
  const keys = Array.from(groups.keys()).sort();
  for (const key of keys) {
    const data = groups.get(key) ?? [];
    const formatted = (() => {
      try {
        return new Date(`${key}T00:00:00`).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return key;
      }
    })();
    const title = `${formatted} — ${data.length} ${data.length === 1 ? 'partido' : 'partidos'}`;
    sections.push({ title, data });
  }
  return sections;
}

function teamName(m: MatchItem, home: boolean): string {
  const t = m.teams.find((tm) => tm.isHome === home);
  return t?.name ?? (home ? 'Local' : 'Visitante');
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function CalendarTab({ competitionId, navigation }: CalendarTabProps) {
  const [sections, setSections] = useState<MatchSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await matchApi.list({ competitionId });
        if (aborted) return;
        // Defensive client-side filter: in mock mode this is already applied,
        // but the real backend currently strips ?competitionId from /api/matches.
        // TODO: backend should honor ?competitionId — drop client filter when it does.
        const filtered = result.data.filter(
          (m: { competitionId: string | null }) => m.competitionId === competitionId,
        );
        setSections(groupByDate(filtered as MatchItem[]));
      } catch (err) {
        if (aborted) return;
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los partidos';
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

  if (sections.length === 0) {
    return (
      <View style={[s.c, s.center, { paddingHorizontal: 24 }]}>
        <Ionicons name="calendar-outline" size={56} color={C.t3} />
        <Text style={s.emptyT}>Aún no hay partidos programados.</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={s.c}
      contentContainerStyle={s.cc}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={s.sectionHead}>
          <Text style={s.sectionT}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const gc = GAME_COLORS[item.gameType] ?? GAME_COLORS.F7!;
        const st = STATUS[item.status] ?? STATUS.SCHEDULED!;
        const hasScore = item.homeScore !== null && item.awayScore !== null;
        return (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
          >
            <View style={[s.accentBar, { backgroundColor: gc.accent }]} />
            <View style={s.cardBody}>
              <View style={s.cardHead}>
                <View style={[s.tag, { backgroundColor: gc.bg }]}>
                  <Text style={[s.tagT, { color: gc.accent }]}>{item.gameType}</Text>
                </View>
                <View style={[s.tag, { backgroundColor: st.bg }]}>
                  <Text style={[s.tagT, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <View style={s.matchRow}>
                <Text style={s.team} numberOfLines={1}>
                  {teamName(item, true)}
                </Text>
                <View style={s.scoreBox}>
                  {hasScore ? (
                    <Text style={s.score}>
                      {item.homeScore} — {item.awayScore}
                    </Text>
                  ) : (
                    <Text style={s.timeT}>{fmtTime(item.scheduledAt)}</Text>
                  )}
                </View>
                <Text style={[s.team, { textAlign: 'right' }]} numberOfLines={1}>
                  {teamName(item, false)}
                </Text>
              </View>
              <View style={s.foot}>
                <Ionicons name="location-outline" size={12} color={C.t3} />
                <Text style={s.footT}>{item.locationName}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  cc: { padding: 16, paddingBottom: 100 },
  center: { justifyContent: 'center', alignItems: 'center' },

  sectionHead: {
    backgroundColor: C.bg,
    paddingVertical: 8,
    marginBottom: 6,
  },
  sectionT: { color: C.t2, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  accentBar: { height: 3 },
  cardBody: { padding: 14 },
  cardHead: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagT: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  team: { flex: 1, color: C.t1, fontSize: 13, fontWeight: '700' },
  scoreBox: { paddingHorizontal: 12, alignItems: 'center' },
  score: { color: C.w, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  timeT: { color: C.blue, fontSize: 13, fontWeight: '800' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footT: { color: C.t3, fontSize: 11 },

  errorT: { color: C.t1, fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptyT: {
    color: C.t1,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});
