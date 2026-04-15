import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { matchApi, clubApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function CreateMatchScreen({ navigation }: any) {
  const { user } = useAuth();
  const [gameType, setGameType] = useState('F7');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const res = await clubApi.list();
      setClubs(res.data);
    } catch (err) {
      console.error('Error loading clubs:', err);
    }
  };

  const handleCreate = async () => {
    if (!locationName || !locationAddress || !scheduledAt || !homeTeamName || !awayTeamName) {
      return Alert.alert('Error', 'Rellena todos los campos obligatorios');
    }

    // Validate date format
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      return Alert.alert('Error', 'Formato de fecha invalido. Usa: YYYY-MM-DD HH:mm');
    }

    setSubmitting(true);
    try {
      const body = {
        gameType,
        locationName,
        locationAddress,
        latitude: 40.4168, // Default Madrid — TODO: location picker
        longitude: -3.7038,
        contactPhone: contactPhone || undefined,
        scheduledAt: date.toISOString(),
        homeTeam: {
          name: homeTeamName,
          clubId: selectedClub || undefined,
          playerIds: [user!.id], // Creator auto-added
        },
        awayTeam: {
          name: awayTeamName,
          playerIds: [],
        },
      };

      const res = await matchApi.create(body);
      Alert.alert('Partido creado!', `ID: ${res.data.id}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={s.title}>Crear Partido</Text>

      <Text style={s.label}>Tipo de juego:</Text>
      <View style={s.row}>
        {['F5', 'F7', 'F11'].map((t) => (
          <TouchableOpacity key={t} style={[s.typeBtn, gameType === t && s.typeBtnActive]} onPress={() => setGameType(t)}>
            <Text style={[s.typeText, gameType === t && s.typeTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Nombre del campo *</Text>
      <TextInput style={s.input} placeholder="Ej: Polideportivo San Juan" placeholderTextColor="#666" value={locationName} onChangeText={setLocationName} />

      <Text style={s.label}>Direccion *</Text>
      <TextInput style={s.input} placeholder="Calle, numero, ciudad" placeholderTextColor="#666" value={locationAddress} onChangeText={setLocationAddress} />

      <Text style={s.label}>Fecha y hora * (YYYY-MM-DD HH:mm)</Text>
      <TextInput style={s.input} placeholder="2025-06-15 20:00" placeholderTextColor="#666" value={scheduledAt} onChangeText={setScheduledAt} />

      <Text style={s.label}>Telefono de contacto (opcional)</Text>
      <TextInput style={s.input} placeholder="+34 600 000 000" placeholderTextColor="#666" keyboardType="phone-pad" value={contactPhone} onChangeText={setContactPhone} />

      <Text style={s.label}>Equipo local *</Text>
      <TextInput style={s.input} placeholder="Nombre del equipo local" placeholderTextColor="#666" value={homeTeamName} onChangeText={setHomeTeamName} />

      <Text style={s.label}>Equipo visitante *</Text>
      <TextInput style={s.input} placeholder="Nombre del equipo visitante" placeholderTextColor="#666" value={awayTeamName} onChangeText={setAwayTeamName} />

      {/* Club selector */}
      {clubs.length > 0 && (
        <>
          <Text style={s.label}>Vincular a club (opcional)</Text>
          <View style={s.clubRow}>
            <TouchableOpacity
              style={[s.clubPill, !selectedClub && s.clubPillActive]}
              onPress={() => setSelectedClub(null)}
            >
              <Text style={[s.clubPillText, !selectedClub && s.clubPillTextActive]}>Ninguno</Text>
            </TouchableOpacity>
            {clubs.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[s.clubPill, selectedClub === c.id && s.clubPillActive]}
                onPress={() => setSelectedClub(c.id)}
              >
                <Text style={[s.clubPillText, selectedClub === c.id && s.clubPillTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={s.btn} onPress={handleCreate} disabled={submitting}>
        <Text style={s.btnText}>{submitting ? 'Creando...' : 'Crear Partido'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 24 },
  backText: { color: '#16db93', fontSize: 16, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1a1a2e', color: '#fff', padding: 14, borderRadius: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  typeBtn: { backgroundColor: '#1a1a2e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, flex: 1, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#16db93' },
  typeText: { color: '#888', fontSize: 16, fontWeight: 'bold' },
  typeTextActive: { color: '#0f0f23' },
  clubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clubPill: { backgroundColor: '#1a1a2e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  clubPillActive: { backgroundColor: '#16db93' },
  clubPillText: { color: '#888', fontSize: 13 },
  clubPillTextActive: { color: '#0f0f23', fontWeight: 'bold' },
  btn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#0f0f23', fontSize: 18, fontWeight: 'bold' },
});
