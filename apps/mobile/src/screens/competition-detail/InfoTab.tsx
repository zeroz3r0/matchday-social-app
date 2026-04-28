// ============================================================================
// InfoTab — Competition info: description, dates, registered clubs, Inscribirme
// ============================================================================
// Reads detail from CompetitionDetailContext. Inscribirme logic per design §1.7:
// - 0 user clubs available → button hidden
// - 1 → tap registers directly
// - >1 → modal picker
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { competitionApi, clubApi } from '../../services/api';
import { captureException } from '../../lib/sentry';
import { showAlert } from '../../utils/alert';
import { C } from '../../utils/theme';
import { useCompetitionDetail } from '../CompetitionDetailScreen';

interface UserClub {
  id: string;
  name: string;
  badgeUrl: string | null;
}

function fmtDate(iso: string | null): string {
  if (iso === null) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function InfoTab() {
  const { detail, refetch } = useCompetitionDetail();
  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const result = await clubApi.list();
        if (aborted) return;
        const clubs = result.data.map((c) => ({
          id: c.id,
          name: c.name,
          badgeUrl: c.badgeUrl,
        }));
        setUserClubs(clubs);
      } catch (err) {
        if (aborted) return;
        captureException(err);
        setUserClubs([]);
      } finally {
        if (!aborted) setLoadingClubs(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const registeredIds = new Set(detail.clubs.map((c) => c.club.id));
  const available = userClubs.filter((c) => !registeredIds.has(c.id));

  const register = async (clubId: string) => {
    setRegistering(true);
    try {
      await competitionApi.registerClub(detail.id, clubId);
      setPickerOpen(false);
      showAlert('¡Listo!', 'Te inscribiste correctamente', () => refetch());
    } catch (err) {
      captureException(err);
      const message = err instanceof Error ? err.message : 'No se pudo inscribir';
      showAlert('Error', message);
    } finally {
      setRegistering(false);
    }
  };

  const handleInscribirme = () => {
    if (available.length === 1) {
      const first = available[0];
      if (first !== undefined) register(first.id);
      return;
    }
    setPickerOpen(true);
  };

  const showInscribirme = !loadingClubs && available.length > 0;

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      {detail.description !== null && detail.description.trim() !== '' && (
        <View style={s.section}>
          <Text style={s.sectionH}>Descripción</Text>
          <Text style={s.body}>{detail.description}</Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionH}>Fechas</Text>
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={C.t2} />
          <Text style={s.metaT}>Inicio: {fmtDate(detail.startDate)}</Text>
        </View>
        {detail.endDate !== null && (
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={C.t2} />
            <Text style={s.metaT}>Fin: {fmtDate(detail.endDate)}</Text>
          </View>
        )}
      </View>

      <View style={s.section}>
        <Text style={s.sectionH}>Creador</Text>
        <View style={s.metaRow}>
          <Ionicons name="person-outline" size={16} color={C.t2} />
          <Text style={s.metaT}>{detail.createdBy.nickname}</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionH}>Clubes inscritos ({detail.clubs.length})</Text>
        {detail.clubs.length === 0 ? (
          <Text style={s.empty}>Aún no hay clubes inscritos.</Text>
        ) : (
          <View style={s.clubList}>
            {detail.clubs.map((link) => (
              <View key={link.club.id} style={s.clubRow}>
                <View style={s.clubBadge}>
                  <Ionicons name="shield" size={18} color={C.primary} />
                </View>
                <Text style={s.clubName}>{link.club.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {showInscribirme && (
        <TouchableOpacity
          style={[s.cta, registering && { opacity: 0.5 }]}
          onPress={handleInscribirme}
          disabled={registering}
        >
          <Ionicons name="add-circle" size={20} color={C.bg} />
          <Text style={s.ctaT}>{registering ? 'Inscribiendo...' : 'Inscribirme'}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={s.modalOv}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalT}>Elegí un club</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={24} color={C.t2} />
              </TouchableOpacity>
            </View>
            {registering ? (
              <View style={[s.center, { padding: 30 }]}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            ) : (
              <FlatList
                data={available}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.pickerRow}
                    onPress={() => register(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={s.clubBadge}>
                      <Ionicons name="shield" size={18} color={C.primary} />
                    </View>
                    <Text style={s.pickerT}>{item.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={C.t3} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  cc: { padding: 16, paddingBottom: 100 },
  center: { justifyContent: 'center', alignItems: 'center' },

  section: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionH: {
    color: C.w,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  body: { color: C.t1, fontSize: 13, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  metaT: { color: C.t1, fontSize: 13 },
  empty: { color: C.t3, fontSize: 13, fontStyle: 'italic' },

  clubList: { gap: 8 },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  clubBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubName: { color: C.t1, fontSize: 13, fontWeight: '600', flex: 1 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaT: { color: C.bg, fontSize: 15, fontWeight: '700' },

  modalOv: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalT: { color: C.w, fontSize: 16, fontWeight: '800' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerT: { color: C.t1, fontSize: 14, fontWeight: '600', flex: 1 },
});
