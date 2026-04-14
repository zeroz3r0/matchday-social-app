import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const CATEGORIES = ['GOALS', 'ASSISTS', 'AVG_RATING', 'MVP_COUNT'] as const;
const LABELS: Record<string, string> = { GOALS: 'Goles', ASSISTS: 'Asistencias', AVG_RATING: 'Nota Media', MVP_COUNT: 'MVPs' };
const SCOPES = ['LOCAL', 'CITY', 'NATIONAL'] as const;

// TODO: Replace with API call
const MOCK_RANKINGS = [
  { rank: 1, userId: '1', nickname: 'CarlosGol', value: 24 },
  { rank: 2, userId: '2', nickname: 'MartaMuro', value: 18 },
  { rank: 3, userId: '3', nickname: 'DavidMago', value: 15 },
];

export function RankingsScreen() {
  const [category, setCategory] = useState<string>('GOALS');
  const [scope, setScope] = useState<string>('NATIONAL');

  return (
    <View style={s.container}>
      {/* Category pills */}
      <View style={s.pillRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[s.pill, category === c && s.pillActive]} onPress={() => setCategory(c)}>
            <Text style={[s.pillText, category === c && s.pillTextActive]}>{LABELS[c]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scope pills */}
      <View style={s.pillRow}>
        {SCOPES.map((sc) => (
          <TouchableOpacity key={sc} style={[s.pill, scope === sc && s.pillActive]} onPress={() => setScope(sc)}>
            <Text style={[s.pillText, scope === sc && s.pillTextActive]}>
              {sc === 'LOCAL' ? '📍 50km' : sc === 'CITY' ? '🏙️ Ciudad' : '🇪🇸 Nacional'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={MOCK_RANKINGS}
        keyExtractor={(r) => r.userId}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={[s.rank, item.rank <= 3 && s.rankTop]}>{item.rank}</Text>
            <View style={s.avatar}><Text>⚽</Text></View>
            <Text style={s.name}>{item.nickname}</Text>
            <Text style={s.value}>{item.value}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  pillRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  pill: { backgroundColor: '#1a1a2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillActive: { backgroundColor: '#16db93' },
  pillText: { color: '#888', fontSize: 12 },
  pillTextActive: { color: '#0f0f23', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 14, borderRadius: 10, marginBottom: 8 },
  rank: { color: '#888', fontSize: 16, fontWeight: 'bold', width: 30 },
  rankTop: { color: '#16db93' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  name: { color: '#fff', fontSize: 16, flex: 1 },
  value: { color: '#16db93', fontSize: 18, fontWeight: 'bold' },
});
