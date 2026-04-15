import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';
import { C } from '../utils/theme';

const POSITIONS = [
  { key: 'GOALKEEPER', label: 'Portero', icon: 'hand-left' },
  { key: 'DEFENDER', label: 'Defensa', icon: 'shield-half-full' },
  { key: 'MIDFIELDER', label: 'Medio', icon: 'strategy' },
  { key: 'FORWARD', label: 'Delantero', icon: 'lightning-bolt' },
] as const;

export function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', nickname: '', position: 'MIDFIELDER', bio: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.nickname) return showAlert('Error', 'Rellena los campos obligatorios');
    setLoading(true);
    try { await register(form); }
    catch (err: any) { showAlert('Error', err.message); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={22} color={C.t2} />
      </TouchableOpacity>

      <Ionicons name="football" size={36} color={C.primary} />
      <Text style={s.title}>Crear cuenta</Text>
      <Text style={s.sub}>Únete a la comunidad de fútbol amateur</Text>

      <View style={s.field}>
        <Ionicons name="person-outline" size={18} color={C.t3} style={s.fIcon} />
        <TextInput style={s.input} placeholder="Nickname" placeholderTextColor={C.t3} value={form.nickname} onChangeText={v => setForm({ ...form, nickname: v })} autoCapitalize="none" />
      </View>
      <View style={s.field}>
        <Ionicons name="mail-outline" size={18} color={C.t3} style={s.fIcon} />
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={C.t3} value={form.email} onChangeText={v => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={s.field}>
        <Ionicons name="lock-closed-outline" size={18} color={C.t3} style={s.fIcon} />
        <TextInput style={s.input} placeholder="Contraseña (mín. 8 caracteres)" placeholderTextColor={C.t3} value={form.password} onChangeText={v => setForm({ ...form, password: v })} secureTextEntry />
      </View>

      <Text style={s.label}>Posición</Text>
      <View style={s.posRow}>
        {POSITIONS.map(p => (
          <TouchableOpacity key={p.key} style={[s.posBtn, form.position === p.key && s.posBtnOn]} onPress={() => setForm({ ...form, position: p.key })}>
            <MaterialCommunityIcons name={p.icon as any} size={18} color={form.position === p.key ? C.bg : C.t3} />
            <Text style={[s.posT, form.position === p.key && s.posTOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.field}>
        <Ionicons name="chatbubble-outline" size={18} color={C.t3} style={s.fIcon} />
        <TextInput style={[s.input, { height: 70 }]} placeholder="Bio (opcional)" placeholderTextColor={C.t3} value={form.bio} onChangeText={v => setForm({ ...form, bio: v })} multiline />
      </View>

      <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading}>
        <Text style={s.btnT}>{loading ? 'Creando...' : 'Registrarse'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={s.loginLink}>
        <Text style={s.loginT}>¿Ya tienes cuenta? <Text style={{ color: C.primary, fontWeight: '600' }}>Inicia sesión</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  cc: { padding: 24, paddingTop: 50 },
  backBtn: { marginBottom: 20 },
  title: { color: C.w, fontSize: 24, fontWeight: '800', marginTop: 12 },
  sub: { color: C.t2, fontSize: 13, marginTop: 4, marginBottom: 28 },
  label: { color: C.t2, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  fIcon: { paddingLeft: 14 },
  input: { flex: 1, color: C.w, padding: 14, fontSize: 14 },
  posRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  posBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.card, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  posBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  posT: { color: C.t3, fontSize: 11, fontWeight: '600' },
  posTOn: { color: C.bg },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnT: { color: C.bg, fontSize: 15, fontWeight: '700' },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginT: { color: C.t2, fontSize: 13 },
});
