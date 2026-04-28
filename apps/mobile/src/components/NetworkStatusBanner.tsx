// ============================================================================
// NetworkStatusBanner — Top banner "Sin conexión" cuando offline
// ----------------------------------------------------------------------------
// REQ-NW-2: solo renderiza cuando isConnected===false. Theme tokens, no
// hardcoded hex aparte de C.red/C.w; accessibilityRole="alert".
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../context/NetworkStatusContext';
import { C } from '../utils/theme';

export function NetworkStatusBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View style={s.root} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={16} color={C.w} />
      <Text style={s.text}>Sin conexión</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    backgroundColor: C.red,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: C.w,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
