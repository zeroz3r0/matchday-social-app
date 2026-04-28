import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../context/NetworkStatusContext';
import { captureException } from '../lib/sentry';
import { showAlert } from '../utils/alert';
import { C, IMG } from '../utils/theme';

export function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return showAlert('Error', 'Rellena todos los campos');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      captureException(err);
      showAlert('Error', err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: IMG.stadium }} style={s.bg} resizeMode="cover">
      <View style={s.overlay}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {/* Brand */}
            <View style={s.brand}>
              <Ionicons name="football" size={44} color={C.primary} />
              <Text style={s.logo}>MATCHDAY</Text>
              <Text style={s.tagline}>La plataforma del fútbol amateur</Text>
            </View>

            {/* Form card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Iniciar sesión</Text>

              <View style={s.field}>
                <Ionicons name="mail-outline" size={20} color={C.t3} style={s.fieldIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={C.t3}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={s.field}>
                <Ionicons name="lock-closed-outline" size={20} color={C.t3} style={s.fieldIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Contraseña"
                  placeholderTextColor={C.t3}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity
                  onPress={() => setShowPw(!showPw)}
                  style={s.eyeBtn}
                  accessibilityLabel={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  accessibilityRole="button"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={C.t3}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[s.btn, (loading || !isConnected) && s.btnOff]}
                onPress={handleLogin}
                disabled={loading || !isConnected}
                activeOpacity={0.8}
              >
                {loading ? (
                  <Ionicons name="reload" size={20} color={C.bg} />
                ) : (
                  <Text style={s.btnText}>Entrar</Text>
                )}
              </TouchableOpacity>

              {!isConnected && <Text style={s.offlineHint}>Sin conexión</Text>}
            </View>

            {/* Register */}
            <TouchableOpacity
              style={s.regBtn}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}
            >
              <Text style={s.regText}>
                ¿No tienes cuenta? <Text style={s.regLink}>Regístrate</Text>
              </Text>
            </TouchableOpacity>

            {/* Features strip */}
            <View style={s.features}>
              <Feat icon="people" label="Partidos" />
              <Feat icon="trophy" label="Torneos" />
              <Feat icon="stats-chart" label="Rankings" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

function Feat({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={s.feat}>
      <Ionicons name={icon} size={18} color={C.primary} />
      <Text style={s.featText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(11,14,26,0.92)' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },

  brand: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 28, fontWeight: '800', color: C.w, letterSpacing: 6, marginTop: 12 },
  tagline: { fontSize: 13, color: C.t2, marginTop: 6, letterSpacing: 0.5 },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { color: C.w, fontSize: 18, fontWeight: '700', marginBottom: 20 },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  fieldIcon: { paddingLeft: 14 },
  input: { flex: 1, color: C.w, padding: 14, fontSize: 15 },
  eyeBtn: { padding: 14 },

  btn: {
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: C.bg, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  offlineHint: {
    color: C.red,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },

  regBtn: { marginTop: 24, alignItems: 'center' },
  regText: { color: C.t2, fontSize: 14 },
  regLink: { color: C.primary, fontWeight: '600' },

  features: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 36 },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featText: { color: C.t2, fontSize: 12, fontWeight: '500' },
});
