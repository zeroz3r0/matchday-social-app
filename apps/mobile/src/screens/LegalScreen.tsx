// ============================================================================
// LegalScreen — Markdown viewer for ToS / Privacy
// ----------------------------------------------------------------------------
// Route param `doc: 'tos' | 'privacy'`. Tri-state (loading / data / error).
// Spanish strings, theme tokens. React 19 — no useCallback / useMemo / forwardRef.
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarkdownRenderer, type MarkdownStyleDict } from '../components/MarkdownRenderer';
import { legalApi } from '../services/api';
import { ErrorView } from '../components/ErrorView';
import { captureException } from '../lib/sentry';
import { C } from '../utils/theme';

type LegalDoc = 'tos' | 'privacy';

const TITLES: Record<LegalDoc, string> = {
  tos: 'Términos de Servicio',
  privacy: 'Política de Privacidad',
};

interface Props {
  navigation: { goBack: () => void };
  route: { params?: { doc?: LegalDoc } };
}

export function LegalScreen({ navigation, route }: Props) {
  const doc: LegalDoc = route.params?.doc ?? 'tos';
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = doc === 'tos' ? await legalApi.getTos() : await legalApi.getPrivacy();
        if (!alive) return;
        setContent(res.data.content);
      } catch (err) {
        captureException(err);
        if (!alive) return;
        setError('No pudimos cargar el documento. Intentá de nuevo.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [doc]);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.closeBtn}
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={C.t1} />
        </TouchableOpacity>
        <Text style={s.title}>{TITLES[doc]}</Text>
        <View style={s.headerSpacer} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <ErrorView
          message={error}
          retry={() => {
            setLoading(true);
            const retry = async () => {
              try {
                const res = doc === 'tos' ? await legalApi.getTos() : await legalApi.getPrivacy();
                setContent(res.data.content);
                setError(null);
              } catch (err) {
                captureException(err);
                setError('No pudimos cargar el documento. Intentá de nuevo.');
              } finally {
                setLoading(false);
              }
            };
            retry();
          }}
        />
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <MarkdownRenderer source={content ?? ''} styles={mdStyles} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  closeBtn: { padding: 8 },
  headerSpacer: { width: 40 },
  title: { flex: 1, color: C.w, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
});

// Markdown style overrides — match dark theme.
// `em` and `ordered_list` keys removed: italic and ordered lists are out of the
// renderer allowlist (per change `replace-react-native-markdown-display`, design §15 addendum).
// `link` key currently inert — renderer emits link as plain text. Reserved for future Linking change.
const mdStyles: MarkdownStyleDict = {
  body: { color: C.t1, fontSize: 14, lineHeight: 22 },
  heading1: {
    color: C.w,
    fontSize: 22,
    fontWeight: '800' as const,
    marginTop: 8,
    marginBottom: 12,
  },
  heading2: {
    color: C.w,
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    color: C.w,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: { color: C.t1, marginVertical: 6 },
  strong: { color: C.w, fontWeight: '700' as const },
  bullet_list: { marginVertical: 4 },
  list_item: { color: C.t1 },
  blockquote: {
    backgroundColor: C.surface,
    borderLeftColor: C.primary,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: C.surface,
    color: C.primary,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  hr: { backgroundColor: C.border, height: 1, marginVertical: 12 },
};
