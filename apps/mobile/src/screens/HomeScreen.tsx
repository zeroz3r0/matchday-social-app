import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

// TODO: Fetch from API
const MOCK_MATCHES = [
  { id: '1', homeTeam: 'Los Cracks FC', awayTeam: 'Barrio United', date: '2025-01-20 20:00', gameType: 'F7', status: 'SCHEDULED' },
  { id: '2', homeTeam: 'Madrid Rovers', awayTeam: 'Los Cracks FC', date: '2025-01-22 21:00', gameType: 'F5', status: 'COMPLETED', score: '4-3' },
];

export function HomeScreen({ navigation }: any) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Proximos Partidos</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('CreateMatch')}>
          <Text style={s.addBtnText}>+ Crear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_MATCHES}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}>
            <Text style={s.gameType}>{item.gameType}</Text>
            <Text style={s.teams}>{item.homeTeam} vs {item.awayTeam}</Text>
            <View style={s.row}>
              <Text style={s.date}>{item.date}</Text>
              {item.score && <Text style={s.score}>{item.score}</Text>}
            </View>
            <View style={[s.badge, item.status === 'COMPLETED' ? s.badgeDone : s.badgePending]}>
              <Text style={s.badgeText}>{item.status === 'COMPLETED' ? 'Finalizado' : 'Programado'}</Text>
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
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
