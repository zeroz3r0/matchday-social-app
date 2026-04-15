import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, ImageBackground } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { COLORS, IMAGES } from '../utils/theme';

const POS: Record<string, { icon: string; label: string }> = {
  GOALKEEPER: { icon: '🧤', label: 'Portero' },
  DEFENDER: { icon: '🛡️', label: 'Defensa' },
  MIDFIELDER: { icon: '🎯', label: 'Centrocampista' },
  FORWARD: { icon: '⚡', label: 'Delantero' },
};

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await userApi.getMe(); setProfile(r.data); } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={[s.c, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  const m = profile?.medals || {}; const st = profile?.stats || {};
  const pos = POS[profile?.position || ''] || { icon: '⚽', label: profile?.position };

  return (
    <ScrollView style={s.c} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>

      {/* Header with background */}
      <ImageBackground source={{ uri: IMAGES.stadiumGrass }} style={s.headerBg} resizeMode="cover">
        <View style={s.headerOverlay}>
          <View style={s.avatarOuter}>
            <View style={s.avatarInner}>
              <Text style={s.avatarText}>{(profile?.nickname || 'J')[0].toUpperCase()}</Text>
            </View>
          </View>
          <Text style={s.nick}>{profile?.nickname || 'Jugador'}</Text>
          <View style={s.posBox}>
            <Text style={s.posIcon}>{pos.icon}</Text>
            <Text style={s.posLabel}>{pos.label}</Text>
          </View>
          {profile?.city && <Text style={s.city}>📍 {profile.city}</Text>}
        </View>
      </ImageBackground>

      <View style={s.body}>
        {/* Rating card */}
        {st.avgRating > 0 && (
          <View style={s.ratingCard}>
            <View style={s.ratingLeft}>
              <Text style={s.ratingNum}>{st.avgRating}</Text>
              <Text style={s.ratingMax}>/10</Text>
            </View>
            <View style={s.ratingRight}>
              <View style={s.stars}>
                {[1,2,3,4,5].map(i => <Text key={i} style={{ fontSize: 18 }}>{i <= Math.round(st.avgRating / 2) ? '⭐' : '☆'}</Text>)}
              </View>
              <Text style={s.ratingVotes}>{st.totalVotesReceived} valoraciones</Text>
            </View>
          </View>
        )}

        {/* Bio */}
        {profile?.bio && (
          <View style={s.bioCard}>
            <Text style={s.bioText}>"{profile.bio}"</Text>
          </View>
        )}

        {/* Stats grid */}
        <Text style={s.section}>Estadísticas</Text>
        <View style={s.grid}>
          <StatCard icon="⚽" val={m.totalGoals || 0} label="Goles" color={COLORS.primary} />
          <StatCard icon="🎯" val={m.totalAssists || 0} label="Asistencias" color={COLORS.blue} />
          <StatCard icon="🏆" val={m.mvpCount || 0} label="MVP" color={COLORS.gold} />
          <StatCard icon="🏟️" val={m.matchesPlayed || 0} label="Partidos" color={COLORS.purple} />
          <StatCard icon="🟨" val={m.totalYellowCards || 0} label="Amarillas" color={COLORS.orange} />
          <StatCard icon="🟥" val={m.totalRedCards || 0} label="Rojas" color={COLORS.red} />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, val, label, color }: { icon: string; val: number; label: string; color: string }) {
  return (
    <View style={[sc.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text style={sc.icon}>{icon}</Text>
      <Text style={[sc.val, { color }]}>{val}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', width: '31%', flexGrow: 1, borderWidth: 1, borderColor: COLORS.border },
  icon: { fontSize: 22, marginBottom: 4 },
  val: { fontSize: 24, fontWeight: '900' },
  label: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, fontWeight: '600' },
});

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },

  headerBg: { height: 260 },
  headerOverlay: { flex: 1, backgroundColor: 'rgba(5,5,26,0.7)', alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  avatarOuter: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.primary, fontSize: 34, fontWeight: '900' },
  nick: { color: '#fff', fontSize: 24, fontWeight: '900' },
  posBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryDim, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  posIcon: { fontSize: 16, marginRight: 6 },
  posLabel: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  city: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },

  body: { padding: 18, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: COLORS.bg },

  ratingCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  ratingLeft: { flexDirection: 'row', alignItems: 'baseline', marginRight: 20 },
  ratingNum: { color: COLORS.gold, fontSize: 42, fontWeight: '900' },
  ratingMax: { color: COLORS.textMuted, fontSize: 18, marginLeft: 2 },
  ratingRight: { flex: 1 },
  stars: { flexDirection: 'row', marginBottom: 4 },
  ratingVotes: { color: COLORS.textSecondary, fontSize: 12 },

  bioCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.border },
  bioText: { color: COLORS.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20 },

  section: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },

  logoutBtn: { backgroundColor: COLORS.redDim, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ff3d5744' },
  logoutText: { color: COLORS.red, fontWeight: '700', fontSize: 15 },
});
