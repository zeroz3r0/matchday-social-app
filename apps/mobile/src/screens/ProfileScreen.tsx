import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: '🧤 Portero',
  DEFENDER: '🛡️ Defensa',
  MIDFIELDER: '🎯 Centrocampista',
  FORWARD: '⚡ Delantero',
};

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await userApi.getMe();
      setProfile(res.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#16db93" /></View>;
  }

  const medals = profile?.medals || {};
  const stats = profile?.stats || {};

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} tintColor="#16db93" />}
    >
      <View style={s.header}>
        <View style={s.avatarWrap}>
          <Text style={s.avatarEmoji}>⚽</Text>
        </View>
        <Text style={s.nickname}>{profile?.nickname || user?.nickname || 'Jugador'}</Text>
        <Text style={s.position}>{POSITION_LABELS[profile?.position || user?.position || ''] || profile?.position}</Text>
        {profile?.city && <Text style={s.city}>📍 {profile.city}</Text>}
        <Text style={s.bio}>{profile?.bio || 'Sin descripcion'}</Text>
      </View>

      {/* Average Rating */}
      {stats.avgRating > 0 && (
        <View style={s.ratingBox}>
          <Text style={s.ratingValue}>{stats.avgRating}</Text>
          <Text style={s.ratingLabel}>Nota media ({stats.totalVotesReceived} votos)</Text>
        </View>
      )}

      <Text style={s.sectionTitle}>Medallas</Text>
      <View style={s.medalsRow}>
        <Medal icon="🏆" label="MVP" value={medals.mvpCount || 0} />
        <Medal icon="⚽" label="Goles" value={medals.totalGoals || 0} />
        <Medal icon="🎯" label="Asist." value={medals.totalAssists || 0} />
        <Medal icon="🟨" label="Amarillas" value={medals.totalYellowCards || 0} />
        <Medal icon="🟥" label="Rojas" value={medals.totalRedCards || 0} />
      </View>

      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{medals.matchesPlayed || 0}</Text>
          <Text style={s.statLabel}>Partidos</Text>
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Cerrar Sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Medal({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <View style={s.medal}>
      <Text style={s.medalIcon}>{icon}</Text>
      <Text style={s.medalValue}>{value}</Text>
      <Text style={s.medalLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarEmoji: { fontSize: 36 },
  nickname: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  position: { color: '#16db93', fontSize: 14, marginTop: 4 },
  city: { color: '#888', fontSize: 13, marginTop: 4 },
  bio: { color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center' },
  ratingBox: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  ratingValue: { color: '#16db93', fontSize: 36, fontWeight: 'bold' },
  ratingLabel: { color: '#888', fontSize: 13, marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  medalsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  medal: { alignItems: 'center' },
  medalIcon: { fontSize: 28 },
  medalValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  medalLabel: { color: '#888', fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  statBox: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', minWidth: 100 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  logoutBtn: { backgroundColor: '#ff4444', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
