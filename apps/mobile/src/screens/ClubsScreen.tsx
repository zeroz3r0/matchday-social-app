import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ImageBackground } from 'react-native';
import { clubApi } from '../services/api';
import { showAlert } from '../utils/alert';
import { COLORS, IMAGES } from '../utils/theme';

const CLUB_COLORS = ['#ff3d57', '#4fc3f7', '#00e676', '#ffd700', '#b388ff', '#ff8c00'];

export function ClubsScreen() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try { const r = await clubApi.list(); setClubs(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return showAlert('Error', 'Nombre requerido');
    setCreating(true);
    try {
      await clubApi.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setShowCreate(false); setNewName(''); setNewDesc('');
      load();
    } catch (e: any) { showAlert('Error', e.message); }
    finally { setCreating(false); }
  };

  if (loading) return <View style={[s.c, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.c}>
      <ImageBackground source={{ uri: IMAGES.teamHuddle }} style={s.hero} resizeMode="cover">
        <View style={s.heroOv}>
          <Text style={s.heroT}>🛡️ Mis Clubes</Text>
          <TouchableOpacity style={s.heroBtn} onPress={() => setShowCreate(true)}><Text style={s.heroBtnT}>+ Crear</Text></TouchableOpacity>
        </View>
      </ImageBackground>

      <FlatList data={clubs} keyExtractor={c => c.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={s.empty}><Text style={{ fontSize: 56 }}>🛡️</Text><Text style={s.emptyT}>Sin clubes</Text><Text style={s.emptyH}>Crea tu equipo y convoca jugadores</Text></View>
        }
        renderItem={({ item, index }) => {
          const color = CLUB_COLORS[index % CLUB_COLORS.length];
          return (
            <View style={s.card}>
              <View style={[s.cardAccent, { backgroundColor: color }]} />
              <View style={s.cardBody}>
                <View style={[s.clubBadge, { backgroundColor: color + '22', borderColor: color }]}>
                  <Text style={[s.clubInitial, { color }]}>{item.name[0]}</Text>
                </View>
                <View style={s.clubInfo}>
                  <Text style={s.clubName}>{item.name}</Text>
                  <Text style={s.clubMeta}>👥 {item._count?.members || item.members?.length || 0} jugadores{item.preferredFormation ? ` · 📋 ${item.preferredFormation}` : ''}</Text>
                  {item.description && <Text style={s.clubDesc} numberOfLines={2}>{item.description}</Text>}
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOv}>
          <View style={s.modal}>
            <Text style={s.modalT}>🛡️ Crear Club</Text>
            <TextInput style={s.modalInput} placeholder="Nombre del club *" placeholderTextColor="#555" value={newName} onChangeText={setNewName} />
            <TextInput style={[s.modalInput, { height: 80 }]} placeholder="Descripción (opcional)" placeholderTextColor="#555" value={newDesc} onChangeText={setNewDesc} multiline />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}><Text style={s.cancelT}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={s.createBtn} onPress={handleCreate} disabled={creating}><Text style={s.createT}>{creating ? 'Creando...' : 'Crear'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  hero: { height: 120 },
  heroOv: { flex: 1, backgroundColor: 'rgba(5,5,26,0.75)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  heroT: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  heroBtnT: { color: COLORS.bg, fontWeight: '800' },

  card: { backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardAccent: { height: 3 },
  cardBody: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  clubBadge: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 2 },
  clubInitial: { fontSize: 22, fontWeight: '900' },
  clubInfo: { flex: 1 },
  clubName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  clubMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  clubDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyT: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 12 },
  emptyH: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6 },

  modalOv: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 24 },
  modal: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  modalT: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  modalInput: { backgroundColor: COLORS.bg, color: '#fff', padding: 14, borderRadius: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelT: { color: COLORS.textSecondary, fontSize: 15 },
  createBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  createT: { color: COLORS.bg, fontWeight: '800', fontSize: 15 },
});
