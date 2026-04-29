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
import { ApiError } from '../services/api';
import { C, IMG } from '../utils/theme';

interface PendingUserShape {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  position: string;
  bio: string | null;
  city: string | null;
}

export function LoginScreen({ navigation }: any) {
  const { login, logout, restoreAccount } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  // Pending state: backend reported `meta.deleted = true`. We hold the user
  // shape until they pick Restaurar (commit) or Cerrar sesión (drop token).
  const [pendingDeletedUser, setPendingDeletedUser] = useState<PendingUserShape | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return showAlert('Error', 'Rellena todos los campos');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.deleted && res.pendingUser) {
        setPendingDeletedUser(res.pendingUser as PendingUserShape);
      }
    } catch (err: unknown) {
      // Honest error mapping (replaces the lying `err.message || "Credenciales
      // incorrectas"` fallback that surfaced wrong copy on timeouts/server
      // errors). Backend now sends a discriminated `error.code`; mobile reads
      // it and chooses the right Spanish message.
      captureException(err);

      let msg = 'Algo salió mal — intentá de nuevo';
      if (err instanceof ApiError) {
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            msg = 'Email o contraseña incorrectos';
            break;
          case 'ACCOUNT_LOCKED':
            msg = 'Cuenta bloqueada — intentá más tarde';
            break;
          default:
            msg = 'Algo salió mal — intentá de nuevo';
        }
      } else if (
        err instanceof TypeError ||
        (err as { message?: string })?.message?.includes('Network') ||
        (err as { name?: string })?.name === 'AbortError'
      ) {
        msg = 'Error de conexión — verificá tu internet';
      }
      showAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!pendingDeletedUser) return;
    setRestoring(true);
    try {
      await restoreAccount(pendingDeletedUser as any);
      showAlert('Cuenta restaurada', '¡Bienvenido de nuevo!');
    } catch (err) {
      captureException(err);
      let msg = 'No pudimos restaurar tu cuenta. Intentá de nuevo.';
      if (err instanceof ApiError) {
        if (err.code === 'GRACE_PERIOD_EXPIRED' || err.code === 'WINDOW_EXPIRED') {
          msg = 'Pasaron más de 30 días. La cuenta ya no se puede restaurar.';
        } else {
          msg = err.message || msg;
        }
      }
      showAlert('Error', msg);
    } finally {
      setRestoring(false);
    }
  };

  const handleAbandon = async () => {
    setPendingDeletedUser(null);
    try {
      await logout();
    } catch (err) {
      captureException(err);
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
            {pendingDeletedUser ? (
              <View style={s.banner} accessibilityRole="alert">
                <Ionicons name="warning-outline" size={20} color={C.gold} />
                <Text style={s.bannerText}>
                  Tu cuenta está pendiente de eliminación. ¿Restaurarla?
                </Text>
                <View style={s.bannerBtns}>
                  <TouchableOpacity
                    style={[s.bannerBtn, s.bannerBtnPrimary]}
                    onPress={handleRestore}
                    disabled={restoring}
                  >
                    <Text style={s.bannerBtnTextPrimary}>
                      {restoring ? 'Restaurando...' : 'Restaurar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.bannerBtn, s.bannerBtnGhost]}
                    onPress={handleAbandon}
                    disabled={restoring}
                  >
                    <Text style={s.bannerBtnTextGhost}>Cerrar sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

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
                onPress={() => navigation.navigate('ForgotPassword')}
                style={s.forgotBtn}
                accessibilityRole="button"
                accessibilityLabel="¿Olvidaste tu contraseña?"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

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
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 12, paddingVertical: 4 },
  forgotText: { color: C.primary, fontSize: 13, fontWeight: '600' },
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

  banner: {
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderColor: 'rgba(255,184,0,0.4)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  bannerText: { color: C.t1, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bannerBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  bannerBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  bannerBtnPrimary: { backgroundColor: C.primary },
  bannerBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.borderLight },
  bannerBtnTextPrimary: { color: C.bg, fontWeight: '700', fontSize: 13 },
  bannerBtnTextGhost: { color: C.t2, fontWeight: '600', fontSize: 13 },
});
