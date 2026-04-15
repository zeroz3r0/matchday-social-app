import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { clubApi } from '../services/api';

export function ClubsScreen() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchClubs = useCallback(async () => {
    try {
      const res = await clubApi.list();
      setClubs(res.data);
    } catch (err) {
      console.error('Error fetching clubs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  const handleCreate = async () => {
    if (!newName.trim()) return Alert.alert('Error', 'Nombre requerido');
    setCreating(true);
    try {
      await clubApi.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      fetchClubs();
      Alert.alert('Club creado!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#16db93" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Mis Clubes</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.addText}>+ Crear Club</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clubs}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🛡️</Text>
            <Text style={s.emptyText}>No tienes clubes aun</Text>
            <Text style={s.emptyHint}>Crea uno para organizar tu equipo</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.badge}><Text style={s.badgeEmoji}>🛡️</Text></View>
            <View style={s.info}>
              <Text style={s.clubName}>{item.name}</Text>
              <Text style={s.meta}>{item._count?.members || item.members?.length || 0} jugadores{item.preferredFormation ? ` · ${item.preferredFormation}` : ''}</Text>
              {item.description && <Text style={s.desc}>{item.description}</Text>}
            </View>
          </View>
        )}
      />

      {/* Create Club Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Crear Club</Text>

            <TextInput style={s.input} placeholder="Nombre del club *" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
            <TextInput style={[s.input, { height: 80 }]} placeholder="Descripcion (opcional)" placeholderTextColor="#666" value={newDesc} onChangeText={setNewDesc} multiline />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.createBtn} onPress={handleCreate} disabled={creating}>
                <Text style={s.createText}>{creating ? 'Creando...' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  desc: { color: '#666', fontSize: 12, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#666', fontSize: 14, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 24 },
  modal: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#0f0f23', color: '#fff', padding: 14, borderRadius: 10, fontSize: 15, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cancelText: { color: '#888', fontSize: 16 },
  createBtn: { flex: 1, backgroundColor: '#16db93', padding: 14, borderRadius: 12, alignItems: 'center' },
  createText: { color: '#0f0f23', fontWeight: 'bold', fontSize: 16 },
});
