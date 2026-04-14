import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'] as const;
const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: '🧤 Portero',
  DEFENDER: '🛡️ Defensa',
  MIDFIELDER: '🎯 Centrocampista',
  FORWARD: '⚡ Delantero',
};

export function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', nickname: '', position: 'MIDFIELDER', bio: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.nickname) return Alert.alert('Error', 'Rellena los campos obligatorios');
    setLoading(true);
    try {
      await register(form);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Crear Cuenta</Text>

      <TextInput style={s.input} placeholder="Nickname *" placeholderTextColor="#666" value={form.nickname} onChangeText={(v) => setForm({ ...form, nickname: v })} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Email *" placeholderTextColor="#666" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Contraseña (min 8 chars) *" placeholderTextColor="#666" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />

      <Text style={s.label}>Posicion:</Text>
      <View style={s.posRow}>
        {POSITIONS.map((pos) => (
          <TouchableOpacity key={pos} style={[s.posBtn, form.position === pos && s.posBtnActive]} onPress={() => setForm({ ...form, position: pos })}>
            <Text style={[s.posText, form.position === pos && s.posTextActive]}>{POSITION_LABELS[pos]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput style={[s.input, { height: 80 }]} placeholder="Bio (opcional, max 280)" placeholderTextColor="#666" value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} multiline />

      <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Creando...' : 'Registrarse'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.link}>Ya tengo cuenta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 30 },
  label: { color: '#aaa', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#1a1a2e', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  posBtn: { backgroundColor: '#1a1a2e', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  posBtnActive: { backgroundColor: '#16db93' },
  posText: { color: '#888', fontSize: 13 },
  posTextActive: { color: '#0f0f23', fontWeight: 'bold' },
  btn: { backgroundColor: '#16db93', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f0f23', fontSize: 18, fontWeight: 'bold' },
  link: { color: '#16db93', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
