import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { matchApi, clubApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';
import { C } from '../utils/theme';

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

  useEffect(() => { clubApi.list().then(r => setClubs(r.data)).catch(() => {}); }, []);

  const handleCreate = async () => {
    if (!locationName || !locationAddress || !scheduledAt || !homeTeamName || !awayTeamName)
      return showAlert('Error', 'Rellena todos los campos obligatorios');
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) return showAlert('Error', 'Formato: YYYY-MM-DD HH:mm');
    setSubmitting(true);
    try {
      await matchApi.create({
        gameType, locationName, locationAddress,
        latitude: 40.4168, longitude: -3.7038,
        contactPhone: contactPhone || undefined,
        scheduledAt: date.toISOString(),
        homeTeam: { name: homeTeamName, clubId: selectedClub || undefined, playerIds: [user!.id] },
        awayTeam: { name: awayTeamName, playerIds: [] },
      });
      showAlert('Partido creado', 'Tu partido ha sido creado', () => navigation.goBack());
    } catch (err: any) { showAlert('Error', err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name="arrow-back" size={22} color={C.t2} />
      </TouchableOpacity>

      <Text style={s.title}>Crear partido</Text>

      <Text style={s.label}>Modalidad</Text>
      <View style={s.typeRow}>
        {['F5', 'F7', 'F11'].map(t => (
          <TouchableOpacity key={t} style={[s.typeBtn, gameType === t && s.typeBtnOn]} onPress={() => setGameType(t)}>
            <Ionicons name="football" size={16} color={gameType === t ? C.bg : C.t3} />
            <Text style={[s.typeT, gameType === t && s.typeTOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Campo</Text>
      <Field icon="location" placeholder="Nombre del campo" value={locationName} onChangeText={setLocationName} />
      <Field icon="map" placeholder="Dirección" value={locationAddress} onChangeText={setLocationAddress} />

      <Text style={s.label}>Fecha y hora</Text>
      <Field icon="calendar" placeholder="2025-06-15 20:00" value={scheduledAt} onChangeText={setScheduledAt} />

      <Text style={s.label}>Contacto (opcional)</Text>
      <Field icon="call" placeholder="+34 600 000 000" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />

      <Text style={s.label}>Equipos</Text>
      <Field icon="shirt" placeholder="Equipo local" value={homeTeamName} onChangeText={setHomeTeamName} />
      <Field icon="shirt-outline" placeholder="Equipo visitante" value={awayTeamName} onChangeText={setAwayTeamName} />

      {clubs.length > 0 && (
        <>
          <Text style={s.label}>Vincular a club</Text>
          <View style={s.clubRow}>
            <TouchableOpacity style={[s.clubPill, !selectedClub && s.clubPillOn]} onPress={() => setSelectedClub(null)}>
              <Text style={[s.clubPillT, !selectedClub && s.clubPillTOn]}>Ninguno</Text>
            </TouchableOpacity>
            {clubs.map(c => (
              <TouchableOpacity key={c.id} style={[s.clubPill, selectedClub === c.id && s.clubPillOn]} onPress={() => setSelectedClub(c.id)}>
                <Text style={[s.clubPillT, selectedClub === c.id && s.clubPillTOn]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={[s.btn, submitting && { opacity: 0.5 }]} onPress={handleCreate} disabled={submitting}>
        <Ionicons name="add-circle" size={20} color={C.bg} />
        <Text style={s.btnT}>{submitting ? 'Creando...' : 'Crear partido'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ icon, placeholder, value, onChangeText, keyboardType }: any) {
  return (
    <View style={s.field}>
      <Ionicons name={icon} size={18} color={C.t3} style={{ paddingLeft: 14 }} />
      <TextInput style={s.input} placeholder={placeholder} placeholderTextColor={C.t3} value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg }, cc: { padding: 24, paddingTop: 50 },
  back: { marginBottom: 16 },
  title: { color: C.w, fontSize: 24, fontWeight: '800', marginBottom: 24 },
  label: { color: C.t2, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.w, padding: 14, fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.card, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  typeBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  typeT: { color: C.t3, fontSize: 15, fontWeight: '700' },
  typeTOn: { color: C.bg },
  clubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clubPill: { backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  clubPillOn: { backgroundColor: C.primary, borderColor: C.primary },
  clubPillT: { color: C.t3, fontSize: 12, fontWeight: '600' },
  clubPillTOn: { color: C.bg },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, padding: 16, borderRadius: 12, marginTop: 28 },
  btnT: { color: C.bg, fontSize: 15, fontWeight: '700' },
});
