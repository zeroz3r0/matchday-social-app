// ============================================================================
// ErrorBoundaryFallback — Sentry.ErrorBoundary fallback UI
// ----------------------------------------------------------------------------
// REQ-MS-3: Mensaje en español + botón "Reintentar" que limpia el boundary
// llamando `resetError`. Usa theme tokens; React 19 — sin useCallback.
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../utils/theme';

type Props = {
  error: unknown;
  componentStack: string | null;
  eventId: string | null;
  resetError: () => void;
};

export function ErrorBoundaryFallback({ resetError }: Props) {
  return (
    <View style={s.root} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={56} color={C.red} />
      <Text style={s.title}>Algo salió mal.</Text>
      <Text style={s.subtitle}>Intentá de nuevo.</Text>

      <TouchableOpacity
        style={s.btn}
        onPress={resetError}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
      >
        <Text style={s.btnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: C.w,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    color: C.t2,
    fontSize: 15,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  btnText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
