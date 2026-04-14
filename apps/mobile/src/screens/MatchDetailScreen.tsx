import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export function MatchDetailScreen({ route, navigation }: any) {
  const { matchId } = route.params || {};

  // TODO: Fetch match from API
  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Detalle del Partido</Text>
      <Text style={s.matchId}>ID: {matchId}</Text>

      <View style={s.scoreBoard}>
        <View style={s.teamCol}>
          <Text style={s.teamName}>Local</Text>
          <Text style={s.score}>4</Text>
        </View>
        <Text style={s.vs}>VS</Text>
        <View style={s.teamCol}>
          <Text style={s.teamName}>Visitante</Text>
          <Text style={s.score}>3</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Estado</Text>
        <Text style={s.statusBadge}>COMPLETED</Text>
      </View>

      <TouchableOpacity style={s.voteBtn} onPress={() => navigation.navigate('Voting', { matchId })}>
        <Text style={s.voteBtnText}>🗳️ Votar MVP y Notas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  matchId: { color: '#666', fontSize: 12, marginBottom: 20 },
  scoreBoard: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  teamCol: { alignItems: 'center', flex: 1 },
  teamName: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  score: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  vs: { color: '#666', fontSize: 20, marginHorizontal: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#888', fontSize: 13, marginBottom: 6 },
  statusBadge: { color: '#16db93', fontWeight: 'bold' },
  voteBtn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center' },
  voteBtnText: { color: '#0f0f23', fontSize: 16, fontWeight: 'bold' },
});
