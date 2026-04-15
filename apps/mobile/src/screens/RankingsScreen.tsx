import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rankingApi } from '../services/api';
import { C } from '../utils/theme';

const CATS = [
  { key: 'GOALS', label: 'Goles', icon: 'football' },
  { key: 'ASSISTS', label: 'Asist.', icon: 'git-merge-outline' },
  { key: 'AVG_RATING', label: 'Nota', icon: 'star' },
  { key: 'MVP_COUNT', label: 'MVPs', icon: 'trophy' },
];
const SCOPES = [
  { key: 'LOCAL', label: '50 km', icon: 'navigate' },
  { key: 'CITY', label: 'Ciudad', icon: 'business' },
  { key: 'NATIONAL', label: 'Nacional', icon: 'earth' },
];
const MEDAL_COLORS = [C.gold, C.silver, C.bronze];

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

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <View style={s.c}>
      <View style={s.header}>
        <Ionicons name="trophy" size={22} color={C.gold} />
        <Text style={s.headerT}>Rankings</Text>
      </View>

      {/* Category tabs */}
      <View style={s.tabs}>{CATS.map(c => (
        <TouchableOpacity key={c.key} style={[s.tab, category === c.key && s.tabOn]} onPress={() => setCategory(c.key)}>
          <Ionicons name={c.icon as any} size={14} color={category === c.key ? C.bg : C.t3} />
          <Text style={[s.tabT, category === c.key && s.tabTOn]}>{c.label}</Text>
        </TouchableOpacity>
      ))}</View>

      <View style={s.tabs}>{SCOPES.map(sc => (
        <TouchableOpacity key={sc.key} style={[s.tab, scope === sc.key && s.tabOn]} onPress={() => setScope(sc.key)}>
          <Ionicons name={sc.icon as any} size={14} color={scope === sc.key ? C.bg : C.t3} />
          <Text style={[s.tabT, scope === sc.key && s.tabTOn]}>{sc.label}</Text>
        </TouchableOpacity>
      ))}</View>

      {loading ? <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={rest} keyExtractor={r => r.userId} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListHeaderComponent={top3.length > 0 ? (
            <View style={s.podium}>
              {top3[1] ? <PodiumCard item={top3[1]} rank={2} color={C.silver} h={70} cat={category} /> : <View style={{ flex: 1 }} />}
              {top3[0] ? <PodiumCard item={top3[0]} rank={1} color={C.gold} h={95} cat={category} /> : <View style={{ flex: 1 }} />}
              {top3[2] ? <PodiumCard item={top3[2]} rank={3} color={C.bronze} h={55} cat={category} /> : <View style={{ flex: 1 }} />}
            </View>
          ) : null}
          ListEmptyComponent={top3.length === 0 ? <View style={s.empty}><Ionicons name="bar-chart-outline" size={48} color={C.t3} /><Text style={s.emptyT}>Sin datos de ranking</Text></View> : null}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.rank}>{item.rank}</Text>
              <View style={s.rowAv}><Text style={s.rowAvT}>{item.nickname[0]}</Text></View>
              <Text style={s.rowN} numberOfLines={1}>{item.nickname}</Text>
              <Text style={s.rowV}>{category === 'AVG_RATING' ? item.value.toFixed(1) : item.value}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function PodiumCard({ item, rank, color, h, cat }: { item: any; rank: number; color: string; h: number; cat: string }) {
  return (
    <View style={p.wrap}>
      <View style={[p.av, { borderColor: color }]}><Text style={p.avT}>{item.nickname[0]}</Text></View>
      <Text style={p.name} numberOfLines={1}>{item.nickname}</Text>
      <Text style={[p.val, { color }]}>{cat === 'AVG_RATING' ? item.value.toFixed(1) : item.value}</Text>
      <View style={[p.bar, { height: h, backgroundColor: color + '20', borderColor: color }]}>
        <Text style={[p.rankN, { color }]}>{rank}</Text>
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', marginHorizontal: 3 },
  av: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 4 },
  avT: { color: C.w, fontSize: 15, fontWeight: '800' },
  name: { color: C.t1, fontSize: 11, fontWeight: '600' },
  val: { fontSize: 18, fontWeight: '900', marginVertical: 4 },
  bar: { width: '85%', borderRadius: 8, borderWidth: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 },
  rankN: { fontSize: 14, fontWeight: '900' },
});

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingBottom: 8 },
  headerT: { color: C.w, fontSize: 22, fontWeight: '800' },

  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 4, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  tabOn: { backgroundColor: C.primary, borderColor: C.primary },
  tabT: { color: C.t3, fontSize: 11, fontWeight: '700' },
  tabTOn: { color: C.bg },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 20, marginBottom: 12 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  rank: { color: C.t3, fontSize: 14, fontWeight: '800', width: 28, textAlign: 'center' },
  rowAv: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rowAvT: { color: C.t2, fontSize: 13, fontWeight: '700' },
  rowN: { color: C.t1, fontSize: 13, fontWeight: '600', flex: 1 },
  rowV: { color: C.primary, fontSize: 16, fontWeight: '900' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyT: { color: C.t2, fontSize: 14, marginTop: 12 },
});
