// ============================================================================
// ResetPasswordScreen — consume reset token and set a new password
// ----------------------------------------------------------------------------
// AU-4 / AR-4: token paste input + new password + confirm. On success, alert
// + navigate to Login. On invalid token (400), inline error pointing back to
// the forgot-password flow. Network-aware. Sentry capture on errors.
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
import { C } from '../utils/theme';

type Navigation = {
  navigate: (screen: string) => void;
  goBack: () => void;
};

type Route = {
  params?: { token?: string };
};

type FieldErrors = {
  token: string | null;
  newPassword: string | null;
  confirmPassword: string | null;
  // top-level form error (e.g. INVALID_TOKEN from backend)
  form: string | null;
};

const EMPTY_ERRORS: FieldErrors = {
  token: null,
  newPassword: null,
  confirmPassword: null,
  form: null,
};

export function ResetPasswordScreen({
  navigation,
  route,
}: {
  navigation: Navigation;
  route?: Route;
}) {
  const { isConnected } = useNetworkStatus();
  const [token, setToken] = useState(route?.params?.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [pending, setPending] = useState(false);

  const validate = (): boolean => {
    const next: FieldErrors = { ...EMPTY_ERRORS };
    let ok = true;

    if (!token.trim()) {
      next.token = 'El token es obligatorio';
      ok = false;
    }
    if (!newPassword) {
      next.newPassword = 'Ingresá una contraseña nueva';
      ok = false;
    } else if (newPassword.length < 8) {
      next.newPassword = 'Mínimo 8 caracteres';
      ok = false;
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Confirmá la contraseña';
      ok = false;
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = 'Las contraseñas no coinciden';
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setPending(true);
    try {
      await authApi.resetPassword(token.trim(), newPassword);
      setPending(false);
      showAlert('¡Contraseña actualizada!', 'Ya podés iniciar sesión.', () =>
        navigation.navigate('Login'),
      );
    } catch (err: unknown) {
      captureException(err);
      setPending(false);

      if (err instanceof ApiError && err.code === 'INVALID_TOKEN') {
        setErrors({
          ...EMPTY_ERRORS,
          form: 'El enlace expiró o es inválido. Pedí uno nuevo.',
        });
        return;
      }
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setErrors({
          ...EMPTY_ERRORS,
          form: 'Revisá los campos e intentá de nuevo.',
        });
        return;
      }
      if (
        err instanceof TypeError ||
        (err as { message?: string })?.message?.includes('Network')
      ) {
        setErrors({
          ...EMPTY_ERRORS,
          form: 'Error de conexión — verificá tu internet',
        });
        return;
      }
      setErrors({
        ...EMPTY_ERRORS,
        form: 'Algo salió mal — intentá de nuevo',
      });
    }
  };

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

        <Ionicons name="lock-open-outline" size={36} color={C.primary} />
        <Text style={s.title}>Restablecer contraseña</Text>
        <Text style={s.sub}>
          Pegá el token que te enviamos por email y elegí una nueva contraseña.
        </Text>

        {/* Token */}
        <View style={[s.field, { alignItems: 'flex-start' }]}>
          <Ionicons name="key-outline" size={18} color={C.t3} style={[s.fIcon, { paddingTop: 14 }]} />
          <TextInput
            style={[s.input, { minHeight: 64 }]}
            placeholder="Pegá el token del email"
            placeholderTextColor={C.t3}
            value={token}
            onChangeText={(v) => {
              setToken(v);
              if (errors.token || errors.form) {
                setErrors({ ...errors, token: null, form: null });
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            editable={!pending}
          />
        </View>
        {errors.token ? <Text style={s.fieldError}>{errors.token}</Text> : null}

        {/* New password */}
        <View style={s.field}>
          <Ionicons name="lock-closed-outline" size={18} color={C.t3} style={s.fIcon} />
          <TextInput
            style={s.input}
            placeholder="Nueva contraseña (mín. 8)"
            placeholderTextColor={C.t3}
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              if (errors.newPassword || errors.form) {
                setErrors({ ...errors, newPassword: null, form: null });
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!pending}
          />
        </View>
        {errors.newPassword ? <Text style={s.fieldError}>{errors.newPassword}</Text> : null}

        {/* Confirm password */}
        <View style={s.field}>
          <Ionicons name="checkmark-done-outline" size={18} color={C.t3} style={s.fIcon} />
          <TextInput
            style={s.input}
            placeholder="Confirmar contraseña"
            placeholderTextColor={C.t3}
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (errors.confirmPassword || errors.form) {
                setErrors({ ...errors, confirmPassword: null, form: null });
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!pending}
          />
        </View>
        {errors.confirmPassword ? (
          <Text style={s.fieldError}>{errors.confirmPassword}</Text>
        ) : null}

        {/* Form-level error */}
        {errors.form ? (
          <View style={s.formErrorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.red} />
            <Text style={s.formErrorText}>{errors.form}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.btn, submitDisabled && s.btnOff]}
          onPress={handleSubmit}
          disabled={submitDisabled}
          activeOpacity={0.8}
        >
          <Text style={s.btnT}>{pending ? 'Procesando…' : 'Restablecer contraseña'}</Text>
        </TouchableOpacity>

        {!isConnected && <Text style={s.offlineHint}>Sin conexión</Text>}

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={s.loginLink}
        >
          <Text style={s.loginT}>
            <Text style={{ color: C.primary, fontWeight: '600' }}>Pedir un nuevo enlace</Text>
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
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  formErrorText: { color: C.red, fontSize: 13, flex: 1 },
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
