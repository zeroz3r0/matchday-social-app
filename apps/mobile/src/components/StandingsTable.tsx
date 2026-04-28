// ============================================================================
// StandingsTable — Render a competition's league standings table.
// ============================================================================
// Props: { rows: StandingRow[] }. Header in Spanish (PJ/G/E/P/GF/GC/Pts).
// Tappable rows fall through to a no-op when no club detail screen is wired.
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { C } from '../utils/theme';

export interface StandingRow {
  rank: number;
  clubId: string;
  clubName: string;
  clubCrest?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

interface StandingsTableProps {
  rows: StandingRow[];
  onRowPress?: (row: StandingRow) => void;
}

function rankColor(rank: number): string {
  if (rank === 1) return C.gold;
  if (rank === 2) return C.silver;
  if (rank === 3) return C.bronze;
  return C.t3;
}

export function StandingsTable({ rows, onRowPress }: StandingsTableProps) {
  return (
    <View style={s.wrap}>
      <View style={[s.row, s.header]}>
        <Text style={[s.cellRank, s.headerText]}>#</Text>
        <Text style={[s.cellClub, s.headerText]}>Club</Text>
        <Text style={[s.cellNum, s.headerText]}>PJ</Text>
        <Text style={[s.cellNum, s.headerText]}>G</Text>
        <Text style={[s.cellNum, s.headerText]}>E</Text>
        <Text style={[s.cellNum, s.headerText]}>P</Text>
        <Text style={[s.cellNum, s.headerText]}>GF</Text>
        <Text style={[s.cellNum, s.headerText]}>GC</Text>
        <Text style={[s.cellNum, s.headerText, s.pts]}>Pts</Text>
      </View>

      {rows.map((row) => (
        <TouchableOpacity
          key={row.clubId}
          activeOpacity={onRowPress ? 0.7 : 1}
          onPress={() => onRowPress?.(row)}
          style={s.row}
        >
          <Text style={[s.cellRank, { color: rankColor(row.rank), fontWeight: '800' }]}>
            {row.rank}
          </Text>
          <Text style={[s.cellClub, s.clubName]} numberOfLines={1}>
            {row.clubName}
          </Text>
          <Text style={s.cellNum}>{row.played}</Text>
          <Text style={s.cellNum}>{row.won}</Text>
          <Text style={s.cellNum}>{row.drawn}</Text>
          <Text style={s.cellNum}>{row.lost}</Text>
          <Text style={s.cellNum}>{row.goalsFor}</Text>
          <Text style={s.cellNum}>{row.goalsAgainst}</Text>
          <Text style={[s.cellNum, s.pts, s.ptsValue]}>{row.points}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  header: {
    backgroundColor: C.surface,
  },
  headerText: {
    color: C.t2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cellRank: {
    width: 28,
    color: C.t1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cellClub: {
    flex: 1,
    paddingHorizontal: 6,
  },
  clubName: {
    color: C.t1,
    fontSize: 13,
    fontWeight: '600',
  },
  cellNum: {
    width: 28,
    color: C.t2,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pts: {
    width: 36,
    color: C.w,
  },
  ptsValue: {
    fontWeight: '800',
  },
});
