import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { matchApi, voteApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function VotingScreen({ route, navigation }: any) {
  const { matchId } = route.params || {};
  const { user } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [mvpPick, setMvpPick] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [matchId]);

  const loadPlayers = async () => {
    try {
      const res = await matchApi.getById(matchId);
      const match = res.data;
      const allPlayers: any[] = [];
      match.teams?.forEach((team: any) => {
        team.players?.forEach((p: any) => {
          if (p.invitationStatus === 'ACCEPTED' && p.user?.id !== user?.id) {
            allPlayers.push({
              id: p.user?.id || p.userId,
              nickname: p.user?.nickname || 'Jugador',
              position: p.user?.position || p.position,
              teamName: team.name,
            });
          }
        });
      });
      setPlayers(allPlayers);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const setRating = (playerId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [playerId]: rating }));
  };

  const handleSubmit = async () => {
    if (!mvpPick) return Alert.alert('MVP', 'Selecciona un MVP');

    const unrated = players.filter((p) => !ratings[p.id]);
    if (unrated.length > 0) return Alert.alert('Faltan notas', `Valora a todos los jugadores (faltan ${unrated.length})`);

    setSubmitting(true);
    try {
      // Submit each vote
      for (const player of players) {
        await voteApi.cast(matchId, {
          targetPlayerId: player.id,
          rating: ratings[player.id]!,
          isMvpVote: player.id === mvpPick,
        });
      }
      Alert.alert('Votos enviados', 'Gracias por votar!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#16db93" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.title}>🗳️ Votacion</Text>
      <Text style={s.subtitle}>Valora a cada jugador del 1 al 10 y elige tu MVP</Text>

      {players.length === 0 && (
        <Text style={s.emptyText}>No hay jugadores para votar</Text>
      )}

      {players.map((player) => (
        <View key={player.id} style={s.playerCard}>
          <View style={s.playerHeader}>
            <View>
              <Text style={s.playerName}>{player.nickname}</Text>
              <Text style={s.playerTeam}>{player.teamName}</Text>
            </View>
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
          {ratings[player.id] && (
            <Text style={s.ratingLabel}>Nota: {ratings[player.id]}/10</Text>
          )}
        </View>
      ))}

      {players.length > 0 && (
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <Text style={s.submitText}>{submitting ? 'Enviando...' : 'Enviar Votos'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 24 },
  backText: { color: '#16db93', fontSize: 16, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 24 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  playerCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 16 },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  playerTeam: { color: '#888', fontSize: 12, marginTop: 2 },
  mvpBtn: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mvpBtnActive: { backgroundColor: '#f0a500' },
  mvpText: { fontSize: 13 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  ratingBtnActive: { backgroundColor: '#16db93' },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ratingLabel: { color: '#16db93', fontSize: 12, marginTop: 8, textAlign: 'right' },
  submitBtn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#0f0f23', fontSize: 18, fontWeight: 'bold' },
});
