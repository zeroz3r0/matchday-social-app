// ============================================================================
// ErrorView — Tri-state error component reusable
// ----------------------------------------------------------------------------
// REQ-EV-1/2/3: ícono Ionicons + mensaje en español + botón "Reintentar"
// opcional. Theme tokens (no hex hardcoded). React 19 — sin useCallback /
// useMemo / forwardRef.
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../utils/theme';

type Props = {
  message: string;
  retry?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function ErrorView({ message, retry, icon = 'alert-circle-outline' }: Props) {
  return (
    <View style={s.root} accessibilityRole="alert" accessibilityLabel={message}>
      <Ionicons name={icon} size={48} color={C.red} />
      <Text style={s.message}>{message}</Text>

      {retry ? (
        <TouchableOpacity
          style={s.btn}
          onPress={retry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
        >
          <Text style={s.btnText}>Reintentar</Text>
        </TouchableOpacity>
      ) : null}
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
  message: {
    color: C.t1,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  btnText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
