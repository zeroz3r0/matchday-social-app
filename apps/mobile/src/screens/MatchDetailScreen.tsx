import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { matchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';
import { C, STATUS, GAME_COLORS } from '../utils/theme';

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
    try { const r = await matchApi.getById(matchId); setMatch(r.data); }
    catch (err: any) { showAlert('Error', err.message || 'No se pudo cargar'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchMatch(); }, [matchId]);

  const handleComplete = async () => {
    const hs = parseInt(homeScoreInput), as_ = parseInt(awayScoreInput);
    if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) return showAlert('Error', 'Marcadores inválidos');
    setCompleting(true);
    try { await matchApi.complete(matchId, hs, as_); showAlert('Finalizado', 'Ventana de votación abierta 12h'); fetchMatch(); setShowScoreForm(false); }
    catch (err: any) { showAlert('Error', err.message); }
    finally { setCompleting(false); }
  };

  const handleInvitation = async (status: 'ACCEPTED' | 'DECLINED') => {
    try { await matchApi.respondInvitation(matchId, status); showAlert('OK', `Invitación ${status === 'ACCEPTED' ? 'aceptada' : 'rechazada'}`); fetchMatch(); }
    catch (err: any) { showAlert('Error', err.message); }
  };

  if (loading) return <View style={[s.c, s.ctr]}><ActivityIndicator size="large" color={C.primary} /></View>;
  if (!match) return <View style={[s.c, s.ctr]}><Text style={{ color: C.t2 }}>Partido no encontrado</Text></View>;

  const homeTeam = match.teams?.find((t: any) => t.isHome);
  const awayTeam = match.teams?.find((t: any) => !t.isHome);
  const isCreator = match.createdById === user?.id;
  const isCompleted = match.status === 'COMPLETED';
  const votingOpen = isCompleted && match.votingDeadline && new Date(match.votingDeadline) > new Date();
  const allPlayers = [...(homeTeam?.players || []), ...(awayTeam?.players || [])];
  const myPlayer = allPlayers.find((p: any) => p.userId === user?.id || p.user?.id === user?.id);
  const isPending = myPlayer?.invitationStatus === 'PENDING';
  const gc = GAME_COLORS[match.gameType] || GAME_COLORS.F7;
  const st = STATUS[match.status] || STATUS.SCHEDULED;

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={C.t2} /></TouchableOpacity>
        <View style={[s.tag, { backgroundColor: st.bg }]}><Text style={[s.tagT, { color: st.color }]}>{st.label}</Text></View>
      </View>

      {/* Match info */}
      <View style={s.infoRow}>
        <View style={[s.tag, { backgroundColor: gc.bg }]}><Text style={[s.tagT, { color: gc.accent }]}>{match.gameType} · {gc.label}</Text></View>
      </View>
      <View style={s.locRow}>
        <Ionicons name="location" size={14} color={C.t3} />
        <Text style={s.locT}>{match.locationName}</Text>
      </View>
      {match.locationAddress && <Text style={s.addrT}>{match.locationAddress}</Text>}
      <View style={s.dateRow}>
        <Ionicons name="calendar" size={14} color={C.t3} />
        <Text style={s.dateT}>{new Date(match.scheduledAt).toLocaleString('es-ES')}</Text>
      </View>

      {/* Scoreboard */}
      <View style={s.board}>
        <View style={s.side}>
          <View style={s.shield}><Ionicons name="shirt" size={28} color={C.t2} /></View>
          <Text style={s.teamN}>{homeTeam?.name || 'Local'}</Text>
        </View>
        <View style={s.mid}>
          <Text style={s.score}>{match.homeScore ?? '—'}</Text>
          <Text style={s.scoreSep}>:</Text>
          <Text style={s.score}>{match.awayScore ?? '—'}</Text>
        </View>
        <View style={[s.side, { alignItems: 'flex-end' }]}>
          <View style={s.shield}><Ionicons name="shirt-outline" size={28} color={C.t2} /></View>
          <Text style={[s.teamN, { textAlign: 'right' }]}>{awayTeam?.name || 'Visitante'}</Text>
        </View>
      </View>

      {/* Players */}
      {[homeTeam, awayTeam].map((team: any, idx: number) => team && (
        <View key={idx} style={s.section}>
          <Text style={s.secTitle}>{team.name}</Text>
          {team.players?.map((p: any) => (
            <View key={p.id} style={s.playerRow}>
              <View style={s.playerAv}><Text style={s.playerAvT}>{(p.user?.nickname || 'J')[0]}</Text></View>
              <Text style={s.playerN}>{p.user?.nickname || 'Jugador'}</Text>
              <View style={[s.invBadge, { backgroundColor: p.invitationStatus === 'ACCEPTED' ? C.primaryMuted : p.invitationStatus === 'DECLINED' ? C.redMuted : C.blueMuted }]}>
                <Text style={[s.invT, { color: p.invitationStatus === 'ACCEPTED' ? C.primary : p.invitationStatus === 'DECLINED' ? C.red : C.blue }]}>{p.invitationStatus === 'ACCEPTED' ? 'Confirmado' : p.invitationStatus === 'DECLINED' ? 'Rechazado' : 'Pendiente'}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* Invitation actions */}
      {isPending && (
        <View style={s.invActions}>
          <TouchableOpacity style={[s.invBtn, { backgroundColor: C.primary }]} onPress={() => handleInvitation('ACCEPTED')}>
            <Ionicons name="checkmark" size={18} color={C.bg} /><Text style={s.invBtnT}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.invBtn, { backgroundColor: C.red }]} onPress={() => handleInvitation('DECLINED')}>
            <Ionicons name="close" size={18} color={C.w} /><Text style={[s.invBtnT, { color: C.w }]}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Complete match */}
      {isCreator && (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && !showScoreForm && (
        <TouchableOpacity style={s.completeBtn} onPress={() => setShowScoreForm(true)}>
          <Ionicons name="flag" size={18} color={C.bg} /><Text style={s.completeBtnT}>Finalizar partido</Text>
        </TouchableOpacity>
      )}

      {showScoreForm && (
        <View style={s.scoreForm}>
          <Text style={s.scoreFormTitle}>Resultado final</Text>
          <View style={s.scoreInputRow}>
            <View style={s.scoreInputW}><Text style={s.scoreLabel}>{homeTeam?.name}</Text><TextInput style={s.scoreInput} keyboardType="number-pad" value={homeScoreInput} onChangeText={setHomeScoreInput} placeholder="0" placeholderTextColor={C.t3} /></View>
            <Text style={s.scoreDash}>—</Text>
            <View style={s.scoreInputW}><Text style={s.scoreLabel}>{awayTeam?.name}</Text><TextInput style={s.scoreInput} keyboardType="number-pad" value={awayScoreInput} onChangeText={setAwayScoreInput} placeholder="0" placeholderTextColor={C.t3} /></View>
          </View>
          <TouchableOpacity style={s.confirmBtn} onPress={handleComplete} disabled={completing}>
            <Text style={s.confirmBtnT}>{completing ? 'Finalizando...' : 'Confirmar resultado'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vote button */}
      {votingOpen && (
        <TouchableOpacity style={s.voteBtn} onPress={() => navigation.navigate('Voting', { matchId, match })}>
          <Ionicons name="thumbs-up" size={18} color={C.bg} /><Text style={s.voteBtnT}>Votar MVP y valoraciones</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg }, ctr: { justifyContent: 'center', alignItems: 'center' },
  cc: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagT: { fontSize: 11, fontWeight: '700' },
  infoRow: { marginBottom: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  locT: { color: C.t1, fontSize: 16, fontWeight: '700' },
  addrT: { color: C.t3, fontSize: 12, marginBottom: 6, marginLeft: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  dateT: { color: C.t2, fontSize: 13 },

  board: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border },
  side: { flex: 1 },
  shield: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  teamN: { color: C.t1, fontSize: 14, fontWeight: '700' },
  mid: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  score: { color: C.w, fontSize: 40, fontWeight: '900' },
  scoreSep: { color: C.t3, fontSize: 28, marginHorizontal: 6 },

  section: { marginBottom: 20 },
  secTitle: { color: C.t2, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  playerAv: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  playerAvT: { color: C.t2, fontSize: 13, fontWeight: '700' },
  playerN: { color: C.t1, fontSize: 14, flex: 1 },
  invBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  invT: { fontSize: 10, fontWeight: '700' },

  invActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  invBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 12 },
  invBtnT: { color: C.bg, fontWeight: '700', fontSize: 14 },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.orange, padding: 16, borderRadius: 12, marginBottom: 16 },
  completeBtnT: { color: C.bg, fontSize: 15, fontWeight: '700' },

  scoreForm: { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  scoreFormTitle: { color: C.w, fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scoreInputW: { alignItems: 'center', flex: 1 },
  scoreLabel: { color: C.t3, fontSize: 11, marginBottom: 6 },
  scoreInput: { backgroundColor: C.bg, color: C.w, fontSize: 32, fontWeight: '900', textAlign: 'center', width: 70, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  scoreDash: { color: C.t3, fontSize: 28, marginHorizontal: 10 },
  confirmBtn: { backgroundColor: C.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  confirmBtnT: { color: C.bg, fontWeight: '700', fontSize: 14 },

  voteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.blue, padding: 16, borderRadius: 12, marginBottom: 16 },
  voteBtnT: { color: C.w, fontSize: 15, fontWeight: '700' },
});
