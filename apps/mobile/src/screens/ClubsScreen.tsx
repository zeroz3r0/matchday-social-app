import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const MOCK_CLUBS = [
  { id: '1', name: 'Los Cracks FC', members: 8, formation: '1-3-2-1' },
  { id: '2', name: 'Barrio United', members: 12, formation: '4-3-3' },
];

export function ClubsScreen() {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Mis Clubes</Text>
        <TouchableOpacity style={s.addBtn}>
          <Text style={s.addText}>+ Crear Club</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_CLUBS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.badge}><Text style={s.badgeEmoji}>🛡️</Text></View>
            <View style={s.info}>
              <Text style={s.clubName}>{item.name}</Text>
              <Text style={s.meta}>{item.members} jugadores · {item.formation}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#16db93', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addText: { color: '#0f0f23', fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 10, alignItems: 'center' },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  badgeEmoji: { fontSize: 24 },
  info: { flex: 1 },
  clubName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  meta: { color: '#888', fontSize: 13, marginTop: 4 },
});
