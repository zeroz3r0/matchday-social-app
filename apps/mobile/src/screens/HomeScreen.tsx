import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { matchApi } from '../services/api';
import { captureException } from '../lib/sentry';
import { C, IMG, GAME_COLORS, STATUS } from '../utils/theme';

export function HomeScreen({ navigation }: any) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const r = await matchApi.list();
      setMatches(r.data);
    } catch (err) {
      captureException(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);
  useEffect(() => {
    const u = navigation.addListener('focus', fetchMatches);
    return u;
  }, [navigation, fetchMatches]);

  const team = (m: any, home: boolean) =>
    m.teams?.find((t: any) => t.isHome === home)?.name || (home ? 'Local' : 'Visitante');
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }),
      time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (loading)
    return (
      <View style={[s.c, s.ctr]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );

  return (
    <View style={s.c}>
      {/* Header */}
      <ImageBackground source={{ uri: IMG.field }} style={s.hero} resizeMode="cover">
        <View style={s.heroOv}>
          <View>
            <Text style={s.heroT}>Partidos</Text>
            <Text style={s.heroS}>
              {matches.length} {matches.length === 1 ? 'encuentro' : 'encuentros'}
            </Text>
          </View>
          <TouchableOpacity style={s.heroBtn} onPress={() => navigation.navigate('CreateMatch')}>
            <Ionicons name="add" size={20} color={C.bg} />
            <Text style={s.heroBtnT}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMatches();
            }}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="football-outline" size={56} color={C.t3} />
            <Text style={s.emptyT}>No hay partidos</Text>
            <Text style={s.emptyH}>Crea el primero y convoca a tus amigos</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreateMatch')}>
              <Text style={s.emptyBtnT}>Crear partido</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const { day, time } = fmtDate(item.scheduledAt);
          const gc = GAME_COLORS[item.gameType] || GAME_COLORS.F7;
          const st = STATUS[item.status] || STATUS.SCHEDULED;
          const hasScore = item.homeScore != null;

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
              activeOpacity={0.7}
            >
              <View style={[s.accentBar, { backgroundColor: gc.accent }]} />
              <View style={s.cardBody}>
                {/* Header */}
                <View style={s.cardHead}>
                  <View style={[s.tag, { backgroundColor: gc.bg }]}>
                    <Text style={[s.tagT, { color: gc.accent }]}>{item.gameType}</Text>
                  </View>
                  <View style={[s.tag, { backgroundColor: st.bg }]}>
                    <Text style={[s.tagT, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                {/* Scoreboard */}
                <View style={s.board}>
                  <View style={s.side}>
                    <View style={s.shield}>
                      <Ionicons name="shirt" size={22} color={C.t2} />
                    </View>
                    <Text style={s.teamN} numberOfLines={1}>
                      {team(item, true)}
                    </Text>
                  </View>
                  <View style={s.mid}>
                    {hasScore ? (
                      <Text style={s.score}>
                        {item.homeScore} — {item.awayScore}
                      </Text>
                    ) : (
                      <View style={s.timeBox}>
                        <Text style={s.timeT}>{time}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[s.side, { alignItems: 'flex-end' }]}>
                    <View style={s.shield}>
                      <Ionicons name="shirt-outline" size={22} color={C.t2} />
                    </View>
                    <Text style={[s.teamN, { textAlign: 'right' }]} numberOfLines={1}>
                      {team(item, false)}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={s.foot}>
                  <View style={s.footItem}>
                    <Ionicons name="calendar-outline" size={13} color={C.t3} />
                    <Text style={s.footT}>{day}</Text>
                  </View>
                  <View style={s.footItem}>
                    <Ionicons name="location-outline" size={13} color={C.t3} />
                    <Text style={s.footT}>{item.locationName || 'Por definir'}</Text>
                  </View>
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
  c: { flex: 1, backgroundColor: C.bg },
  ctr: { justifyContent: 'center', alignItems: 'center' },
  hero: { height: 130 },
  heroOv: {
    flex: 1,
    backgroundColor: 'rgba(11,14,26,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  heroT: { color: C.w, fontSize: 24, fontWeight: '800' },
  heroS: { color: C.t2, fontSize: 13, marginTop: 2 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnT: { color: C.bg, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  accentBar: { height: 3 },
  cardBody: { padding: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  tagT: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  board: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  side: { flex: 1 },
  shield: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamN: { color: C.t1, fontSize: 13, fontWeight: '700' },
  mid: { paddingHorizontal: 12, alignItems: 'center' },
  score: { color: C.w, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  timeBox: {
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeT: { color: C.blue, fontSize: 14, fontWeight: '800' },

  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footT: { color: C.t3, fontSize: 11 },

  empty: { alignItems: 'center', paddingTop: 70 },
  emptyT: { color: C.t1, fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyH: { color: C.t2, fontSize: 13, marginTop: 6 },
  emptyBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyBtnT: { color: C.bg, fontWeight: '700' },
});
