import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { rankingApi } from '../services/api';
import { COLORS, IMAGES } from '../utils/theme';

const CATS = [
  { key: 'GOALS', label: '⚽ Goles' },
  { key: 'ASSISTS', label: '🎯 Asist.' },
  { key: 'AVG_RATING', label: '⭐ Nota' },
  { key: 'MVP_COUNT', label: '🏆 MVPs' },
];
const SCOPES = [
  { key: 'LOCAL', label: '📍 50km' },
  { key: 'CITY', label: '🏙️ Ciudad' },
  { key: 'NATIONAL', label: '🇪🇸 Nacional' },
];
const MEDALS = ['🥇', '🥈', '🥉'];

export function RankingsScreen() {
  const [category, setCategory] = useState('GOALS');
  const [scope, setScope] = useState('NATIONAL');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string> = { category, scope };
      if (scope === 'LOCAL') { p.latitude = '40.4168'; p.longitude = '-3.7038'; }
      if (scope === 'CITY') { p.city = 'Madrid'; }
      const r = await rankingApi.get(p);
      setData(r.data);
    } catch {} finally { setLoading(false); }
  }, [category, scope]);

  useEffect(() => { load(); }, [load]);

  // Top 3 for podium
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <View style={s.c}>
      {/* Header */}
      <ImageBackground source={{ uri: IMAGES.trophy }} style={s.hero} resizeMode="cover">
        <View style={s.heroOv}>
          <Text style={s.heroTitle}>🏆 Rankings</Text>
        </View>
      </ImageBackground>

      {/* Filter pills */}
      <View style={s.pills}>{CATS.map(c => (
        <TouchableOpacity key={c.key} style={[s.pill, category === c.key && s.pillOn]} onPress={() => setCategory(c.key)}>
          <Text style={[s.pillT, category === c.key && s.pillTOn]}>{c.label}</Text>
        </TouchableOpacity>
      ))}</View>
      <View style={s.pills}>{SCOPES.map(sc => (
        <TouchableOpacity key={sc.key} style={[s.pill, scope === sc.key && s.pillOn]} onPress={() => setScope(sc.key)}>
          <Text style={[s.pillT, scope === sc.key && s.pillTOn]}>{sc.label}</Text>
        </TouchableOpacity>
      ))}</View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={rest}
          keyExtractor={r => r.userId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListHeaderComponent={top3.length > 0 ? (
            <View style={s.podium}>
              {/* 2nd place */}
              {top3[1] ? <PodiumItem item={top3[1]} medal={MEDALS[1]} height={80} color={COLORS.silver} cat={category} /> : <View style={{ flex: 1 }} />}
              {/* 1st place */}
              {top3[0] ? <PodiumItem item={top3[0]} medal={MEDALS[0]} height={110} color={COLORS.gold} cat={category} /> : <View style={{ flex: 1 }} />}
              {/* 3rd place */}
              {top3[2] ? <PodiumItem item={top3[2]} medal={MEDALS[2]} height={60} color={COLORS.bronze} cat={category} /> : <View style={{ flex: 1 }} />}
            </View>
          ) : null}
          ListEmptyComponent={top3.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 48 }}>📊</Text><Text style={s.emptyT}>Sin datos de ranking aún</Text></View> : null}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.rank}>{item.rank}</Text>
              <View style={s.rowAvatar}><Text style={{ fontSize: 16 }}>⚽</Text></View>
              <Text style={s.rowName} numberOfLines={1}>{item.nickname}</Text>
              <Text style={s.rowVal}>{category === 'AVG_RATING' ? item.value.toFixed(1) : item.value}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function PodiumItem({ item, medal, height, color, cat }: { item: any; medal: string; height: number; color: string; cat: string }) {
  return (
    <View style={[ps.wrap, { flex: 1, alignItems: 'center' }]}>
      <Text style={{ fontSize: 28 }}>{medal}</Text>
      <View style={[ps.avatar, { borderColor: color }]}><Text style={ps.initial}>{item.nickname[0]}</Text></View>
      <Text style={ps.name} numberOfLines={1}>{item.nickname}</Text>
      <Text style={[ps.val, { color }]}>{cat === 'AVG_RATING' ? item.value.toFixed(1) : item.value}</Text>
      <View style={[ps.bar, { height, backgroundColor: color + '33', borderColor: color }]} />
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: { marginHorizontal: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginVertical: 6, borderWidth: 2 },
  initial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { color: '#fff', fontSize: 12, fontWeight: '700' },
  val: { fontSize: 20, fontWeight: '900', marginVertical: 4 },
  bar: { width: '80%', borderRadius: 8, borderWidth: 1, marginTop: 4 },
});

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  hero: { height: 100 },
  heroOv: { flex: 1, backgroundColor: 'rgba(5,5,26,0.75)', justifyContent: 'center', paddingHorizontal: 20 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },

  pills: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  pill: { backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  pillOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillT: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  pillTOn: { color: COLORS.bg, fontWeight: '800' },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 20, marginBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  rank: { color: COLORS.textMuted, fontSize: 15, fontWeight: '800', width: 30, textAlign: 'center' },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowName: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  rowVal: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyT: { color: COLORS.textSecondary, fontSize: 15, marginTop: 12 },
});
