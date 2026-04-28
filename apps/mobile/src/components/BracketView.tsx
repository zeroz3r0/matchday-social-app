// ============================================================================
// BracketView — Render tournament brackets as a vertical list of stages.
// ============================================================================
// Props: { stages: BracketStage[] }. Each stage is a section header followed
// by match cards. Simple vertical layout (NOT a tree visualization) per spec.
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { View, Text, StyleSheet } from 'react-native';
import { C } from '../utils/theme';

export interface BracketMatch {
  matchId: string | null; // null = TBD
  homeClubName: string;
  awayClubName: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface BracketStage {
  name: string;
  matches: BracketMatch[];
}

interface BracketViewProps {
  stages: BracketStage[];
}

function scoreCell(score: number | null): string {
  return score === null ? '–' : String(score);
}

export function BracketView({ stages }: BracketViewProps) {
  return (
    <View style={s.wrap}>
      {stages.map((stage, stageIdx) => (
        <View key={`${stage.name}-${stageIdx}`} style={s.stage}>
          <Text style={s.stageHeader}>{stage.name}</Text>
          {stage.matches.map((m, idx) => (
            <View key={m.matchId ?? `${stage.name}-${idx}`} style={s.card}>
              <View style={s.row}>
                <Text style={s.team} numberOfLines={1}>
                  {m.homeClubName}
                </Text>
                <Text style={s.score}>{scoreCell(m.homeScore)}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.row}>
                <Text style={s.team} numberOfLines={1}>
                  {m.awayClubName}
                </Text>
                <Text style={s.score}>{scoreCell(m.awayScore)}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    gap: 18,
  },
  stage: {
    gap: 10,
  },
  stageHeader: {
    color: C.w,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  team: {
    flex: 1,
    color: C.t1,
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 12,
  },
  score: {
    color: C.w,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
});
