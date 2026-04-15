import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { matchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function MatchDetailScreen({ route, navigation }: any) {
  const { matchId } = route.params || {};
  const { user } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [homeScoreInput, setHomeScoreInput] = useState('');
  const [awayScoreInput, setAwayScoreInput] = useState('');
  const [showScoreForm, setShowScoreForm] = useState(false);

  const fetchMatch = async () => {
    try {
      const res = await matchApi.getById(matchId);
      setMatch(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo cargar el partido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatch(); }, [matchId]);

  const handleComplete = async () => {
    const hs = parseInt(homeScoreInput);
    const as_ = parseInt(awayScoreInput);
    if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
      return Alert.alert('Error', 'Introduce marcadores validos');
    }
    setCompleting(true);
    try {
      await matchApi.complete(matchId, hs, as_);
      Alert.alert('Partido finalizado', 'Ventana de votacion abierta 12h');
      fetchMatch();
      setShowScoreForm(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleInvitation = async (status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await matchApi.respondInvitation(matchId, status);
      Alert.alert('OK', `Invitacion ${status === 'ACCEPTED' ? 'aceptada' : 'rechazada'}`);
      fetchMatch();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#16db93" /></View>;
  }

  if (!match) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: '#888' }}>Partido no encontrado</Text></View>;
  }

  const homeTeam = match.teams?.find((t: any) => t.isHome);
  const awayTeam = match.teams?.find((t: any) => !t.isHome);
  const isCreator = match.createdById === user?.id;
  const isCompleted = match.status === 'COMPLETED';
  const votingOpen = isCompleted && match.votingDeadline && new Date(match.votingDeadline) > new Date();

  const myPlayer = [...(homeTeam?.players || []), ...(awayTeam?.players || [])]
    .find((p: any) => p.userId === user?.id || p.user?.id === user?.id);
  const isPending = myPlayer?.invitationStatus === 'PENDING';

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.gameType}>{match.gameType}</Text>
      <Text style={s.location}>{match.locationName}</Text>
      <Text style={s.address}>{match.locationAddress}</Text>
      <Text style={s.date}>{new Date(match.scheduledAt).toLocaleString('es-ES')}</Text>

      <View style={s.scoreBoard}>
        <View style={s.teamCol}>
          <Text style={s.teamName}>{homeTeam?.name || 'Local'}</Text>
          <Text style={s.score}>{match.homeScore ?? '-'}</Text>
        </View>
        <Text style={s.vs}>VS</Text>
        <View style={s.teamCol}>
          <Text style={s.teamName}>{awayTeam?.name || 'Visitante'}</Text>
          <Text style={s.score}>{match.awayScore ?? '-'}</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Estado</Text>
        <Text style={[s.statusBadge, isCompleted && { color: '#16db93' }]}>{match.status}</Text>
      </View>

      {[homeTeam, awayTeam].map((team: any, idx: number) => team && (
        <View key={idx} style={s.section}>
          <Text style={s.sectionTitle}>{team.name}</Text>
          {team.players?.map((p: any) => (
            <View key={p.id} style={s.playerRow}>
              <Text style={s.playerName}>{p.user?.nickname || 'Jugador'}</Text>
              <Text style={[s.invStatus, p.invitationStatus === 'ACCEPTED' && { color: '#16db93' }, p.invitationStatus === 'DECLINED' && { color: '#ff4444' }]}>
                {p.invitationStatus}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {isPending && (
        <View style={s.invActions}>
          <TouchableOpacity style={[s.invBtn, { backgroundColor: '#16db93' }]} onPress={() => handleInvitation('ACCEPTED')}>
            <Text style={s.invBtnText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.invBtn, { backgroundColor: '#ff4444' }]} onPress={() => handleInvitation('DECLINED')}>
            <Text style={s.invBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}

      {isCreator && match.status === 'SCHEDULED' && !showScoreForm && (
        <TouchableOpacity style={s.completeBtn} onPress={() => setShowScoreForm(true)}>
          <Text style={s.completeBtnText}>Finalizar Partido</Text>
        </TouchableOpacity>
      )}

      {showScoreForm && (
        <View style={s.scoreForm}>
          <Text style={s.scoreFormTitle}>Introduce el marcador</Text>
          <View style={s.scoreInputRow}>
            <View style={s.scoreInputWrap}>
              <Text style={s.scoreLabel}>{homeTeam?.name}</Text>
              <TextInput style={s.scoreInput} keyboardType="number-pad" value={homeScoreInput} onChangeText={setHomeScoreInput} placeholder="0" placeholderTextColor="#666" />
            </View>
            <Text style={s.scoreDash}>-</Text>
            <View style={s.scoreInputWrap}>
              <Text style={s.scoreLabel}>{awayTeam?.name}</Text>
              <TextInput style={s.scoreInput} keyboardType="number-pad" value={awayScoreInput} onChangeText={setAwayScoreInput} placeholder="0" placeholderTextColor="#666" />
            </View>
          </View>
          <TouchableOpacity style={s.completeBtn} onPress={handleComplete} disabled={completing}>
            <Text style={s.completeBtnText}>{completing ? 'Finalizando...' : 'Confirmar Resultado'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {votingOpen && (
        <TouchableOpacity style={s.voteBtn} onPress={() => navigation.navigate('Voting', { matchId, match })}>
          <Text style={s.voteBtnText}>🗳️ Votar MVP y Notas</Text>
        </TouchableOpacity>
      )}

      {match.mvpResult && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏆 MVP</Text>
          <Text style={s.mvpText}>Resultado calculado</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', padding: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#16db93', fontSize: 16 },
  gameType: { color: '#16db93', fontWeight: 'bold', fontSize: 14 },
  location: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  address: { color: '#888', fontSize: 13, marginTop: 2 },
  date: { color: '#aaa', fontSize: 14, marginTop: 8, marginBottom: 20 },
  scoreBoard: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  teamCol: { alignItems: 'center', flex: 1 },
  teamName: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  score: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  vs: { color: '#666', fontSize: 20, marginHorizontal: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#888', fontSize: 13, marginBottom: 8, textTransform: 'uppercase' },
  statusBadge: { color: '#f0a500', fontWeight: 'bold', fontSize: 16 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  playerName: { color: '#fff', fontSize: 15 },
  invStatus: { color: '#888', fontSize: 13 },
  invActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  invBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  invBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  completeBtn: { backgroundColor: '#f0a500', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  completeBtnText: { color: '#0f0f23', fontSize: 16, fontWeight: 'bold' },
  scoreForm: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 20 },
  scoreFormTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scoreInputWrap: { alignItems: 'center', flex: 1 },
  scoreLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  scoreInput: { backgroundColor: '#0f0f23', color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', width: 80, padding: 10, borderRadius: 8 },
  scoreDash: { color: '#666', fontSize: 32, marginHorizontal: 12 },
  voteBtn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  voteBtnText: { color: '#0f0f23', fontSize: 16, fontWeight: 'bold' },
  mvpText: { color: '#f0a500', fontSize: 15 },
});
