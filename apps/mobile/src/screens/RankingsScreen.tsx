import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { rankingApi } from '../services/api';

const CATEGORIES = ['GOALS', 'ASSISTS', 'AVG_RATING', 'MVP_COUNT'] as const;
const LABELS: Record<string, string> = { GOALS: 'Goles', ASSISTS: 'Asistencias', AVG_RATING: 'Nota Media', MVP_COUNT: 'MVPs' };
const SCOPES = ['LOCAL', 'CITY', 'NATIONAL'] as const;

export function RankingsScreen() {
  const [category, setCategory] = useState<string>('GOALS');
  const [scope, setScope] = useState<string>('NATIONAL');
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { category, scope };
      // For LOCAL scope, would need user location — use defaults for now
      if (scope === 'LOCAL') {
        params.latitude = '40.4168';
        params.longitude = '-3.7038';
      }
      if (scope === 'CITY') {
        params.city = 'Madrid';
      }
      const res = await rankingApi.get(params);
      setRankings(res.data);
    } catch (err) {
      console.error('Error fetching rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [category, scope]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

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

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#16db93" />
        </View>
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No hay datos de ranking aun</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={[s.rank, item.rank <= 3 && s.rankTop]}>
                {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `${item.rank}`}
              </Text>
              <View style={s.avatar}><Text>⚽</Text></View>
              <Text style={s.name}>{item.nickname}</Text>
              <Text style={s.value}>
                {category === 'AVG_RATING' ? item.value.toFixed(1) : item.value}
              </Text>
            </View>
          )}
        />
      )}
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
  rank: { color: '#888', fontSize: 16, fontWeight: 'bold', width: 36 },
  rankTop: { color: '#16db93' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  name: { color: '#fff', fontSize: 16, flex: 1 },
  value: { color: '#16db93', fontSize: 18, fontWeight: 'bold' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#666', fontSize: 15 },
});
