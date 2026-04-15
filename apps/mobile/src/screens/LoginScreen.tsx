import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alert';
import { COLORS, IMAGES } from '../utils/theme';

export function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return showAlert('Error', 'Rellena todos los campos');
    setLoading(true);
    try { await login(email, password); }
    catch (err: any) { showAlert('Error', err.message || 'Credenciales incorrectas'); }
    finally { setLoading(false); }
  };

  return (
    <ImageBackground source={{ uri: IMAGES.stadiumNight }} style={s.bg} resizeMode="cover">
      <View style={s.overlay}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={s.logoWrap}>
              <View style={s.logoBox}>
                <Text style={s.logoIcon}>⚽</Text>
              </View>
              <Text style={s.brand}>MATCHDAY</Text>
              <Text style={s.tagline}>Organiza · Juega · Compite</Text>
            </View>

            {/* Glass card */}
            <View style={s.glass}>
              <Text style={s.formTitle}>Iniciar Sesión</Text>

              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>📧</Text>
                <TextInput style={s.input} placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>

              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry />
              </View>

              <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
                <Text style={s.btnText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
              </TouchableOpacity>

              <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>o</Text><View style={s.divLine} /></View>

              <TouchableOpacity style={s.regBtn} onPress={() => navigation.navigate('Register')}>
                <Text style={s.regText}>Crear cuenta nueva</Text>
              </TouchableOpacity>
            </View>

            {/* Features */}
            <View style={s.features}>
              <Feature icon="🏟️" text="Partidos F5, F7, F11" />
              <Feature icon="🏆" text="Ligas y torneos" />
              <Feature icon="⭐" text="Rankings y MVP" />
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.feat}>
      <Text style={s.featIcon}>{icon}</Text>
      <Text style={s.featText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(5,5,26,0.88)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, maxWidth: 440, alignSelf: 'center', width: '100%' },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primaryDim, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: COLORS.primary },
  logoIcon: { fontSize: 40 },
  brand: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },

  glass: { backgroundColor: 'rgba(13,17,38,0.85)', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 28 },
  formTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, color: '#fff', padding: 15, fontSize: 15 },

  btn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  btnText: { color: COLORS.bg, fontSize: 16, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText: { color: COLORS.textMuted, marginHorizontal: 14, fontSize: 13 },

  regBtn: { borderWidth: 1.5, borderColor: COLORS.primary, padding: 14, borderRadius: 14, alignItems: 'center' },
  regText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },

  features: { flexDirection: 'row', justifyContent: 'space-around' },
  feat: { alignItems: 'center' },
  featIcon: { fontSize: 28, marginBottom: 6 },
  featText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
});
