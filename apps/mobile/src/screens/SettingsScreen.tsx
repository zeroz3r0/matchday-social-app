// ============================================================================
// SettingsScreen — Cuenta + Legal
// ----------------------------------------------------------------------------
// REQ-ML-4..7 — Mi cuenta (Eliminar cuenta + Descargar mis datos) + Legal links.
// Spanish strings, theme tokens. React 19 — sin useCallback / useMemo / forwardRef.
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { ApiError } from '../services/api';
import { captureException } from '../lib/sentry';
import { showAlert } from '../utils/alert';
import { C } from '../utils/theme';

interface Props {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export function SettingsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const confirmDelete = () => {
    const title = '¿Eliminar tu cuenta?';
    const msg = 'Tendrás 30 días para restaurarla. Después se eliminará permanentemente.';
    if (Platform.OS === 'web') {
      const ok = window.confirm(`${title}\n\n${msg}`);
      if (ok) doDelete();
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDelete },
    ]);
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await userApi.deleteMe();
      // Logout clears token + user. The next time the user logs in, the
      // restore banner kicks in via meta.deleted on the login response.
      await logout();
      // Show post-delete confirmation. The auth-stack switch is automatic.
      showAlert('Cuenta eliminada', 'Tienes 30 días para restaurarla iniciando sesión.');
    } catch (err) {
      captureException(err);
      let msg = 'No pudimos eliminar tu cuenta. Intentá de nuevo.';
      if (err instanceof ApiError) {
        msg = err.message || msg;
      }
      showAlert('Error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await userApi.exportData();
      showAlert('Exportación solicitada', 'Te enviaremos un email con el ZIP en breve.');
    } catch (err) {
      captureException(err);
      let msg = 'No pudimos preparar tu export. Intentá de nuevo.';
      if (err instanceof ApiError) {
        if (err.code === 'EXPORT_RATE_LIMIT') {
          msg = 'Ya solicitaste un export hace menos de 24h.';
        } else {
          msg = err.message || msg;
        }
      }
      showAlert('Error', msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityLabel="Volver"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.title}>Configuración</Text>
        <View style={s.headerSpacer} />
      </View>

      {/* Mi cuenta */}
      <Text style={s.section}>Mi cuenta</Text>
      <View style={s.card}>
        <Row
          icon="trash-outline"
          color={C.red}
          label="Eliminar cuenta"
          onPress={confirmDelete}
          loading={deleting}
        />
        <View style={s.divider} />
        <Row
          icon="download-outline"
          color={C.primary}
          label="Descargar mis datos"
          onPress={doExport}
          loading={exporting}
        />
      </View>

      {/* Legal */}
      <Text style={s.section}>Legal</Text>
      <View style={s.card}>
        <Row
          icon="document-text-outline"
          color={C.t1}
          label="Términos de Servicio"
          onPress={() => navigation.navigate('Legal', { doc: 'tos' })}
        />
        <View style={s.divider} />
        <Row
          icon="lock-closed-outline"
          color={C.t1}
          label="Política de Privacidad"
          onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}
        />
      </View>
    </ScrollView>
  );
}

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
}

function Row({ icon, color, label, onPress, loading }: RowProps) {
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={color} style={s.rowIcon} />
      <Text style={[s.rowLabel, color === C.red && { color: C.red }]}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={C.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={C.t3} />
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 4 },
  headerSpacer: { width: 30 },
  title: { flex: 1, color: C.w, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  section: {
    color: C.t2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rowIcon: { width: 24, textAlign: 'center' },
  rowLabel: { flex: 1, color: C.t1, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 52 },
});
