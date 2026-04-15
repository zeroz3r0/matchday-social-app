import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { matchApi } from '../services/api';

export function HomeScreen({ navigation }: any) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await matchApi.list();
      setMatches(res.data);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchMatches);
    return unsub;
  }, [navigation, fetchMatches]);

  const getTeamName = (match: any, isHome: boolean) =>
    match.teams?.find((t: any) => t.isHome === isHome)?.name || (isHome ? 'Local' : 'Visitante');

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16db93" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Proximos Partidos</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('CreateMatch')}>
          <Text style={s.addBtnText}>+ Crear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMatches(); }} tintColor="#16db93" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⚽</Text>
            <Text style={s.emptyText}>No tienes partidos aun</Text>
            <Text style={s.emptyHint}>Crea uno o espera una invitacion</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}>
            <Text style={s.gameType}>{item.gameType}</Text>
            <Text style={s.teams}>{getTeamName(item, true)} vs {getTeamName(item, false)}</Text>
            <View style={s.row}>
              <Text style={s.date}>{formatDate(item.scheduledAt)}</Text>
              {item.homeScore !== null && item.awayScore !== null && (
                <Text style={s.score}>{item.homeScore}-{item.awayScore}</Text>
              )}
            </View>
            <View style={[s.badge, item.status === 'COMPLETED' ? s.badgeDone : item.status === 'CANCELLED' ? s.badgeCancelled : s.badgePending]}>
              <Text style={s.badgeText}>
                {item.status === 'COMPLETED' ? 'Finalizado' : item.status === 'CANCELLED' ? 'Cancelado' : item.status === 'POSTPONED' ? 'Aplazado' : 'Programado'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  addBtn: { backgroundColor: '#16db93', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#0f0f23', fontWeight: 'bold' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 12 },
  gameType: { color: '#16db93', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  teams: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: '#888', fontSize: 13 },
  score: { color: '#16db93', fontSize: 18, fontWeight: 'bold' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  badgeDone: { backgroundColor: '#16db9333' },
  badgePending: { backgroundColor: '#f0a50033' },
  badgeCancelled: { backgroundColor: '#ff444433' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#666', fontSize: 14, marginTop: 4 },
});
