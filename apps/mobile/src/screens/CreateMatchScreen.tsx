import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

export function CreateMatchScreen({ navigation }: any) {
  const [gameType, setGameType] = useState('F7');

  // TODO: Implement full form with Google Maps location picker
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Crear Partido</Text>

      <Text style={s.label}>Tipo de juego:</Text>
      <View style={s.row}>
        {['F5', 'F7', 'F11'].map((t) => (
          <TouchableOpacity key={t} style={[s.typeBtn, gameType === t && s.typeBtnActive]} onPress={() => setGameType(t)}>
            <Text style={[s.typeText, gameType === t && s.typeTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Nombre del campo:</Text>
      <TextInput style={s.input} placeholder="Ej: Polideportivo San Juan" placeholderTextColor="#666" />

      <Text style={s.label}>Direccion:</Text>
      <TextInput style={s.input} placeholder="Calle, numero, ciudad" placeholderTextColor="#666" />

      <Text style={s.label}>Fecha y hora:</Text>
      <TextInput style={s.input} placeholder="2025-01-25 20:00" placeholderTextColor="#666" />

      <Text style={s.label}>Telefono de contacto del campo:</Text>
      <TextInput style={s.input} placeholder="+34 600 000 000" placeholderTextColor="#666" keyboardType="phone-pad" />

      {/* TODO: Player selection from contacts/clubs */}
      <Text style={s.note}>Seleccion de jugadores proximamente (invitaciones por push notification)</Text>

      <TouchableOpacity style={s.btn} onPress={() => Alert.alert('TODO', 'Conectar con API')}>
        <Text style={s.btnText}>Crear Partido</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1a1a2e', color: '#fff', padding: 14, borderRadius: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  typeBtn: { backgroundColor: '#1a1a2e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, flex: 1, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#16db93' },
  typeText: { color: '#888', fontSize: 16, fontWeight: 'bold' },
  typeTextActive: { color: '#0f0f23' },
  note: { color: '#555', fontSize: 12, marginTop: 20, textAlign: 'center' },
  btn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#0f0f23', fontSize: 18, fontWeight: 'bold' },
});
