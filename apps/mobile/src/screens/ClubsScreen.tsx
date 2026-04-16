import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clubApi } from '../services/api';
import { showAlert } from '../utils/alert';
import { C } from '../utils/theme';

const ACCENTS = [C.red, C.blue, C.primary, C.gold, C.purple, C.orange];

export function ClubsScreen() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await clubApi.list();
      setClubs(r.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return showAlert('Error', 'Nombre requerido');
    setCreating(true);
    try {
      await clubApi.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading)
    return (
      <View style={[s.c, s.ctr]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );

  return (
    <View style={s.c}>
      <View style={s.header}>
        <View>
          <Ionicons name="shield" size={22} color={C.primary} />
          <Text style={s.headerT}>Clubes</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={18} color={C.bg} />
          <Text style={s.addBtnT}>Crear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clubs}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="shield-outline" size={48} color={C.t3} />
            <Text style={s.emptyT}>Sin clubes</Text>
            <Text style={s.emptyH}>Crea tu equipo y empieza a competir</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const accent = ACCENTS[index % ACCENTS.length];
          return (
            <View style={s.card}>
              <View style={[s.accent, { backgroundColor: accent }]} />
              <View style={s.cardBody}>
                <View style={[s.badge, { backgroundColor: accent + '18', borderColor: accent }]}>
                  <Text style={[s.badgeT, { color: accent }]}>{item.name[0]}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.clubN}>{item.name}</Text>
                  <View style={s.metaRow}>
                    <Ionicons name="people-outline" size={12} color={C.t3} />
                    <Text style={s.metaT}>{item._count?.members || 0} jugadores</Text>
                    {item.preferredFormation && (
                      <>
                        <Ionicons
                          name="grid-outline"
                          size={12}
                          color={C.t3}
                          style={{ marginLeft: 8 }}
                        />
                        <Text style={s.metaT}>{item.preferredFormation}</Text>
                      </>
                    )}
                  </View>
                  {item.description && (
                    <Text style={s.desc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.t4} />
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.mOv}>
          <View style={s.modal}>
            <View style={s.mHead}>
              <Text style={s.mTitle}>Crear Club</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color={C.t2} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.mInput}
              placeholder="Nombre del club"
              placeholderTextColor={C.t3}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[s.mInput, { height: 80 }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor={C.t3}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />
            <TouchableOpacity style={s.mBtn} onPress={handleCreate} disabled={creating}>
              <Text style={s.mBtnT}>{creating ? 'Creando...' : 'Crear club'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  ctr: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  headerT: { color: C.w, fontSize: 22, fontWeight: '800', marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnT: { color: C.bg, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  accent: { height: 2 },
  cardBody: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
  },
  badgeT: { fontSize: 18, fontWeight: '900' },
  info: { flex: 1 },
  clubN: { color: C.t1, fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaT: { color: C.t3, fontSize: 11 },
  desc: { color: C.t3, fontSize: 11, marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyT: { color: C.t1, fontSize: 18, fontWeight: '700', marginTop: 14 },
  emptyH: { color: C.t2, fontSize: 13, marginTop: 4 },

  mOv: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  mHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mTitle: { color: C.w, fontSize: 18, fontWeight: '700' },
  mInput: {
    backgroundColor: C.bg,
    color: C.w,
    padding: 14,
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  mBtn: {
    backgroundColor: C.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  mBtnT: { color: C.bg, fontWeight: '700', fontSize: 14 },
});
