import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  // TODO: Fetch full profile with medals from /api/users/me
  const medals = { mvpCount: 3, totalGoals: 12, totalAssists: 8, totalYellowCards: 2, totalRedCards: 0 };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.avatarWrap}>
          <Text style={s.avatarEmoji}>⚽</Text>
        </View>
        <Text style={s.nickname}>{user?.nickname || 'Jugador'}</Text>
        <Text style={s.position}>{user?.position}</Text>
        <Text style={s.bio}>{user?.bio || 'Sin descripcion'}</Text>
      </View>

      <Text style={s.sectionTitle}>Medallas</Text>
      <View style={s.medalsRow}>
        <Medal icon="🏆" label="MVP" value={medals.mvpCount} />
        <Medal icon="⚽" label="Goles" value={medals.totalGoals} />
        <Medal icon="🎯" label="Asist." value={medals.totalAssists} />
        <Medal icon="🟨" label="Amarillas" value={medals.totalYellowCards} />
        <Medal icon="🟥" label="Rojas" value={medals.totalRedCards} />
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Cerrar Sesion</Text>
      </TouchableOpacity>
    </View>
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
  container: { flex: 1, backgroundColor: '#0f0f23', padding: 24 },
  header: { alignItems: 'center', marginBottom: 30 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarEmoji: { fontSize: 36 },
  nickname: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  position: { color: '#16db93', fontSize: 14, marginTop: 4 },
  bio: { color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  medalsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  medal: { alignItems: 'center' },
  medalIcon: { fontSize: 28 },
  medalValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  medalLabel: { color: '#888', fontSize: 11, marginTop: 2 },
  logoutBtn: { backgroundColor: '#ff4444', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 'auto' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
