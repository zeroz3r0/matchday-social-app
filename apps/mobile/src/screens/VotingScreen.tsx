import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

// TODO: Fetch real players from match
const MOCK_PLAYERS = [
  { id: '1', nickname: 'CarlosGol', position: 'FORWARD' },
  { id: '2', nickname: 'MartaMuro', position: 'DEFENDER' },
  { id: '3', nickname: 'DavidMago', position: 'MIDFIELDER' },
];

export function VotingScreen({ route }: any) {
  const { matchId } = route.params || {};
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [mvpPick, setMvpPick] = useState<string | null>(null);

  const setRating = (playerId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [playerId]: rating }));
  };

  const handleSubmit = () => {
    if (!mvpPick) return Alert.alert('MVP', 'Selecciona un MVP');
    // TODO: Submit votes to API
    Alert.alert('Enviado', 'Votos registrados correctamente');
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>🗳️ Votacion</Text>
      <Text style={s.subtitle}>Valora a cada jugador del 1 al 10</Text>

      {MOCK_PLAYERS.map((player) => (
        <View key={player.id} style={s.playerCard}>
          <View style={s.playerHeader}>
            <Text style={s.playerName}>{player.nickname}</Text>
            <TouchableOpacity
              style={[s.mvpBtn, mvpPick === player.id && s.mvpBtnActive]}
              onPress={() => setMvpPick(player.id)}
            >
              <Text style={s.mvpText}>🏆 MVP</Text>
            </TouchableOpacity>
          </View>

          <View style={s.ratingRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <TouchableOpacity
                key={n}
                style={[s.ratingBtn, (ratings[player.id] || 0) >= n && s.ratingBtnActive]}
                onPress={() => setRating(player.id, n)}
              >
                <Text style={s.ratingText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
        <Text style={s.submitText}>Enviar Votos</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 24 },
  playerCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 16 },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  mvpBtn: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mvpBtnActive: { backgroundColor: '#f0a500' },
  mvpText: { fontSize: 13 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  ratingBtnActive: { backgroundColor: '#16db93' },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#0f0f23', fontSize: 18, fontWeight: 'bold' },
});
