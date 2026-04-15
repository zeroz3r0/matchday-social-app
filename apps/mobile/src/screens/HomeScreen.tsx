import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ImageBackground } from 'react-native';
import { matchApi } from '../services/api';
import { COLORS, IMAGES, GAME_TYPE_COLORS, STATUS_CONFIG } from '../utils/theme';

export function HomeScreen({ navigation }: any) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try { const res = await matchApi.list(); setMatches(res.data); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);
  useEffect(() => { const u = navigation.addListener('focus', fetchMatches); return u; }, [navigation, fetchMatches]);

  const team = (m: any, home: boolean) => m.teams?.find((t: any) => t.isHome === home)?.name || (home ? 'Local' : 'Visitante');

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return { day: d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }), time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Cargando partidos...</Text></View>;

  return (
    <View style={s.container}>
      {/* Hero banner */}
      <ImageBackground source={{ uri: IMAGES.fieldTopDown }} style={s.hero} resizeMode="cover">
        <View style={s.heroOverlay}>
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>⚽ Mis Partidos</Text>
            <Text style={s.heroSub}>{matches.length} {matches.length === 1 ? 'partido programado' : 'partidos'}</Text>
          </View>
          <TouchableOpacity style={s.heroBtn} onPress={() => navigation.navigate('CreateMatch')}>
            <Text style={s.heroBtnText}>+ Crear</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMatches(); }} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 72 }}>🏟️</Text>
            <Text style={s.emptyTitle}>No hay partidos</Text>
            <Text style={s.emptyHint}>¡Crea el primero y convoca a tus amigos!</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreateMatch')}><Text style={s.emptyBtnT}>Crear partido</Text></TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const { day, time } = fmtDate(item.scheduledAt);
          const gt = GAME_TYPE_COLORS[item.gameType] || GAME_TYPE_COLORS.F7;
          const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.SCHEDULED;
          const hasScore = item.homeScore != null && item.awayScore != null;

          return (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })} activeOpacity={0.7}>
              {/* Colored top accent bar */}
              <View style={[s.accent, { backgroundColor: gt.text }]} />

              <View style={s.cardInner}>
                {/* Header: game type + status */}
                <View style={s.cardHeader}>
                  <View style={[s.badge, { backgroundColor: gt.bg }]}>
                    <Text style={[s.badgeText, { color: gt.text }]}>{item.gameType} · {gt.label}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Text style={[s.badgeText, { color: st.color }]}>{st.icon} {st.label}</Text>
                  </View>
                </View>

                {/* Scoreboard */}
                <View style={s.scoreboard}>
                  <View style={s.teamCol}>
                    <View style={s.teamBadge}><Text style={{ fontSize: 22 }}>🏠</Text></View>
                    <Text style={s.teamName} numberOfLines={1}>{team(item, true)}</Text>
                  </View>

                  <View style={s.scoreCenter}>
                    {hasScore ? (
                      <View style={s.scoreRow}>
                        <Text style={s.scoreNum}>{item.homeScore}</Text>
                        <Text style={s.scoreDash}>—</Text>
                        <Text style={s.scoreNum}>{item.awayScore}</Text>
                      </View>
                    ) : (
                      <View style={s.timeBox}><Text style={s.timeText}>{time}</Text></View>
                    )}
                  </View>

                  <View style={[s.teamCol, { alignItems: 'flex-end' }]}>
                    <View style={s.teamBadge}><Text style={{ fontSize: 22 }}>✈️</Text></View>
                    <Text style={[s.teamName, { textAlign: 'right' }]} numberOfLines={1}>{team(item, false)}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={s.cardFooter}>
                  <Text style={s.footerText}>📅 {day}</Text>
                  <Text style={s.footerText}>📍 {item.locationName || 'Por definir'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  hero: { height: 140 },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(5,5,26,0.75)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  heroContent: {},
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  heroBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  heroBtnText: { color: COLORS.bg, fontWeight: '800', fontSize: 14 },

  card: { backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  accent: { height: 3 },
  cardInner: { padding: 16 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  scoreboard: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  teamCol: { flex: 1, alignItems: 'flex-start' },
  teamBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  teamName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },

  scoreCenter: { paddingHorizontal: 12, alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreNum: { color: '#fff', fontSize: 32, fontWeight: '900' },
  scoreDash: { color: COLORS.textMuted, fontSize: 24, marginHorizontal: 8 },
  timeBox: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 },
  timeText: { color: COLORS.blue, fontSize: 16, fontWeight: '800' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  footerText: { color: COLORS.textMuted, fontSize: 11 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 },
  emptyHint: { color: COLORS.textSecondary, fontSize: 14, marginTop: 8 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 24 },
  emptyBtnT: { color: COLORS.bg, fontWeight: '800' },
});
