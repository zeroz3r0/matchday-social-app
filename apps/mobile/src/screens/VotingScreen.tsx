import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { matchApi, voteApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';
import { C } from '../utils/theme';

export function VotingScreen({ route, navigation }: any) {
  const { matchId } = route.params || {};
  const { user } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [mvpPick, setMvpPick] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await matchApi.getById(matchId);
        const all: any[] = [];
        r.data.teams?.forEach((t: any) => {
          t.players?.forEach((p: any) => {
            if (p.invitationStatus === 'ACCEPTED' && p.user?.id !== user?.id) {
              all.push({ id: p.user?.id || p.userId, nickname: p.user?.nickname || 'Jugador', teamName: t.name });
            }
          });
        });
        setPlayers(all);
      } catch (err: any) { showAlert('Error', err.message); }
      finally { setLoading(false); }
    })();
  }, [matchId]);

  const handleSubmit = async () => {
    if (!mvpPick) return showAlert('MVP', 'Selecciona un MVP');
    const unrated = players.filter(p => !ratings[p.id]);
    if (unrated.length > 0) return showAlert('Faltan valoraciones', `Valora a los ${unrated.length} jugadores restantes`);

    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        players.map(p => voteApi.cast(matchId, { targetPlayerId: p.id, rating: ratings[p.id]!, isMvpVote: p.id === mvpPick }))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) showAlert('Aviso', `${failed} votos no se enviaron`);
      else showAlert('Votos enviados', 'Gracias por votar', () => navigation.goBack());
    } catch (err: any) { showAlert('Error', err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={[s.c, s.ctr]}><ActivityIndicator size="large" color={C.primary} /></View>;

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={C.t2} /></TouchableOpacity>

      <View style={s.header}>
        <Ionicons name="thumbs-up" size={24} color={C.blue} />
        <Text style={s.title}>Valoraciones</Text>
      </View>
      <Text style={s.sub}>Puntúa a cada jugador del 1 al 10 y elige tu MVP</Text>

      {players.length === 0 && <Text style={s.emptyT}>No hay jugadores para valorar</Text>}

      {players.map(player => (
        <View key={player.id} style={s.card}>
          <View style={s.cardHead}>
            <View style={s.cardLeft}>
              <View style={s.av}><Text style={s.avT}>{player.nickname[0]}</Text></View>
              <View><Text style={s.pName}>{player.nickname}</Text><Text style={s.pTeam}>{player.teamName}</Text></View>
            </View>
            <TouchableOpacity style={[s.mvpBtn, mvpPick === player.id && s.mvpBtnOn]} onPress={() => setMvpPick(player.id)}>
              <Ionicons name="trophy" size={14} color={mvpPick === player.id ? C.bg : C.gold} />
              <Text style={[s.mvpT, mvpPick === player.id && s.mvpTOn]}>MVP</Text>
            </TouchableOpacity>
          </View>

          <View style={s.ratingRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <TouchableOpacity key={n} style={[s.rBtn, (ratings[player.id] || 0) >= n && s.rBtnOn]} onPress={() => setRatings(prev => ({ ...prev, [player.id]: n }))}>
                <Text style={[s.rBtnT, (ratings[player.id] || 0) >= n && s.rBtnTOn]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {ratings[player.id] && <Text style={s.rLabel}>{ratings[player.id]}/10</Text>}
        </View>
      ))}

      {players.length > 0 && (
        <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting}>
          <Ionicons name="send" size={18} color={C.bg} />
          <Text style={s.submitT}>{submitting ? 'Enviando...' : 'Enviar valoraciones'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg }, ctr: { justifyContent: 'center', alignItems: 'center' },
  cc: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  title: { color: C.w, fontSize: 22, fontWeight: '800' },
  sub: { color: C.t2, fontSize: 13, marginTop: 4, marginBottom: 24 },
  emptyT: { color: C.t3, textAlign: 'center', marginTop: 40 },

  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  av: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  avT: { color: C.t2, fontSize: 14, fontWeight: '700' },
  pName: { color: C.t1, fontSize: 14, fontWeight: '700' },
  pTeam: { color: C.t3, fontSize: 11, marginTop: 1 },

  mvpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.goldMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' },
  mvpBtnOn: { backgroundColor: C.gold, borderColor: C.gold },
  mvpT: { color: C.gold, fontSize: 12, fontWeight: '700' },
  mvpTOn: { color: C.bg },

  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  rBtnOn: { backgroundColor: C.primary },
  rBtnT: { color: C.t3, fontSize: 12, fontWeight: '700' },
  rBtnTOn: { color: C.bg },
  rLabel: { color: C.primary, fontSize: 12, marginTop: 8, textAlign: 'right', fontWeight: '700' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, padding: 16, borderRadius: 12, marginTop: 8 },
  submitT: { color: C.bg, fontSize: 15, fontWeight: '700' },
});
