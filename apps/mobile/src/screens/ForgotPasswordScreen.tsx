// ============================================================================
// ForgotPasswordScreen — request a password reset link
// ----------------------------------------------------------------------------
// AU-3 / AR-1: single email input, "Enviar enlace" button, ALWAYS shows the
// vague success message regardless of API response (anti-enumeration UX).
// Network-aware (disabled while offline). Sentry capture on unexpected errors.
// React 19 — sin useCallback / useMemo / forwardRef.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi, ApiError } from '../services/api';
import { useNetworkStatus } from '../context/NetworkStatusContext';
import { captureException } from '../lib/sentry';
import { showAlert } from '../utils/alert';
import { ErrorView } from '../components/ErrorView';
import { C } from '../utils/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VAGUE_SUCCESS_MESSAGE = 'Si tu email está registrado, recibirás un email';

type ScreenState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'fatal'; message: string };

export function ForgotPasswordScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [state, setState] = useState<ScreenState>({ status: 'idle' });

  const handleSubmit = async () => {
    setEmailError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('El email es obligatorio');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Ingresá un email válido');
      return;
    }

    setState({ status: 'pending' });
    try {
      await authApi.forgotPassword(trimmed);
    } catch (err: unknown) {
      // Anti-enumeration: even on unexpected errors we surface the SAME vague
      // message to the user, but capture for ourselves so we can debug.
      captureException(err);
      // For genuinely catastrophic errors (e.g. JSON parse failure with no
      // response body), we still keep the UX consistent. ApiError + network
      // errors here all collapse to the vague success path.
      if (!(err instanceof ApiError) && !(err instanceof TypeError)) {
        // Truly unknown — show fatal screen with retry
        setState({
          status: 'fatal',
          message: 'Algo salió mal — intentá de nuevo en unos minutos',
        });
        return;
      }
    }

    // Always-success UX (locked by spec AR-1)
    setState({ status: 'idle' });
    showAlert('Listo', VAGUE_SUCCESS_MESSAGE, () => navigation.goBack());
  };

  if (state.status === 'fatal') {
    return (
      <ErrorView
        message={state.message}
        retry={() => setState({ status: 'idle' })}
      />
    );
  }

  const pending = state.status === 'pending';
  const submitDisabled = pending || !isConnected;

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityLabel="Volver"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={C.t2} />
        </TouchableOpacity>

        <Ionicons name="key-outline" size={36} color={C.primary} />
        <Text style={s.title}>Recuperar contraseña</Text>
        <Text style={s.sub}>
          Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
        </Text>

        <View style={s.field}>
          <Ionicons name="mail-outline" size={18} color={C.t3} style={s.fIcon} />
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={C.t3}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!pending}
          />
        </View>
        {emailError ? <Text style={s.fieldError}>{emailError}</Text> : null}

        <TouchableOpacity
          style={[s.btn, submitDisabled && s.btnOff]}
          onPress={handleSubmit}
          disabled={submitDisabled}
          activeOpacity={0.8}
        >
          <Text style={s.btnT}>{pending ? 'Enviando…' : 'Enviar enlace'}</Text>
        </TouchableOpacity>

        {!isConnected && <Text style={s.offlineHint}>Sin conexión</Text>}

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.loginLink}>
          <Text style={s.loginT}>
            <Text style={{ color: C.primary, fontWeight: '600' }}>Volver al login</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  cc: { padding: 24, paddingTop: 50 },
  backBtn: { marginBottom: 20 },
  title: { color: C.w, fontSize: 24, fontWeight: '800', marginTop: 12 },
  sub: { color: C.t2, fontSize: 13, marginTop: 4, marginBottom: 28, lineHeight: 19 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  fIcon: { paddingLeft: 14 },
  input: { flex: 1, color: C.w, padding: 14, fontSize: 14 },
  fieldError: { color: C.red, fontSize: 12, marginTop: 2, marginBottom: 8, marginLeft: 4 },
  btn: {
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnOff: { opacity: 0.5 },
  btnT: { color: C.bg, fontSize: 15, fontWeight: '700' },
  offlineHint: {
    color: C.red,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginT: { color: C.t2, fontSize: 13 },
});
