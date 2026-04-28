// ============================================================================
// CompetitionDetailScreen — Hero + 4 top-tabs (Info / Standings / Calendar / Brackets)
// ============================================================================
// Fetches WireCompetitionDetail once on mount, exposes via context to children
// to avoid per-tab re-fetch (design §1.10 + §Interfaces).
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { competitionApi } from '../services/api';
import type { WireCompetitionDetail } from '../services/api';
import type { CompetitionStackParamList } from '../navigation/RootNavigator';
import { C, IMG, GAME_COLORS } from '../utils/theme';
import { InfoTab } from './competition-detail/InfoTab';
import { StandingsTab } from './competition-detail/StandingsTab';
import { CalendarTab } from './competition-detail/CalendarTab';
import { BracketsTab } from './competition-detail/BracketsTab';

const TYPE_LABEL: Record<string, string> = {
  LEAGUE: 'Liga',
  TOURNAMENT: 'Torneo',
  KNOCKOUT: 'Eliminatoria',
};

// Context — sub-tabs read detail without re-fetching.
interface CompetitionDetailContextValue {
  detail: WireCompetitionDetail;
  refetch: () => void;
}
const CompetitionDetailCtx = createContext<CompetitionDetailContextValue | null>(null);

export function useCompetitionDetail(): CompetitionDetailContextValue {
  const ctx = useContext(CompetitionDetailCtx);
  if (ctx === null) {
    throw new Error('useCompetitionDetail must be used within CompetitionDetailScreen');
  }
  return ctx;
}

const Tab = createMaterialTopTabNavigator();

type Props = NativeStackScreenProps<CompetitionStackParamList, 'CompetitionDetail'>;

export function CompetitionDetailScreen({ route, navigation }: Props) {
  const id = route.params.id;
  const [detail, setDetail] = useState<WireCompetitionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await competitionApi.getById(id);
      setDetail(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar la competición';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={[s.c, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (error !== null || detail === null) {
    return (
      <View style={[s.c, s.center, { paddingHorizontal: 24 }]}>
        <Ionicons name="alert-circle-outline" size={56} color={C.red} />
        <Text style={s.errorT}>Competición no encontrada</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.bg} />
          <Text style={s.backT}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gc = GAME_COLORS[detail.gameType] ?? GAME_COLORS.F7!;

  return (
    <CompetitionDetailCtx.Provider value={{ detail, refetch: load }}>
      <View style={s.c}>
        <ImageBackground source={{ uri: IMG.field }} style={s.hero} resizeMode="cover">
          <View style={s.heroOv}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backIcon}>
              <Ionicons name="arrow-back" size={22} color={C.w} />
            </TouchableOpacity>
            <View style={s.heroBody}>
              <View style={s.heroTags}>
                <View style={[s.tag, { backgroundColor: gc.bg }]}>
                  <Text style={[s.tagT, { color: gc.accent }]}>{detail.gameType}</Text>
                </View>
                <View style={[s.tag, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Text style={[s.tagT, { color: C.w }]}>
                    {TYPE_LABEL[detail.type] ?? detail.type}
                  </Text>
                </View>
              </View>
              <Text style={s.heroT} numberOfLines={2}>
                {detail.name}
              </Text>
              <View style={s.heroMeta}>
                <View style={s.heroMetaItem}>
                  <Ionicons name="location-outline" size={13} color={C.t1} />
                  <Text style={s.heroMetaT}>{detail.city}</Text>
                </View>
                <View style={s.heroMetaItem}>
                  <Ionicons name="person-outline" size={13} color={C.t1} />
                  <Text style={s.heroMetaT}>{detail.createdBy.nickname}</Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>

        <Tab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: C.card, elevation: 0, shadowOpacity: 0 },
            tabBarActiveTintColor: C.primary,
            tabBarInactiveTintColor: C.t3,
            tabBarLabelStyle: { fontSize: 12, fontWeight: '700', textTransform: 'none' },
            tabBarIndicatorStyle: { backgroundColor: C.primary, height: 3 },
            lazy: true,
          }}
        >
          <Tab.Screen name="Info" component={InfoTab} options={{ title: 'Info' }} />
          <Tab.Screen
            name="Standings"
            options={{ title: 'Tabla' }}
            initialParams={{ competitionId: id }}
          >
            {() => <StandingsTab competitionId={id} />}
          </Tab.Screen>
          <Tab.Screen
            name="Calendar"
            options={{ title: 'Calendario' }}
            initialParams={{ competitionId: id }}
          >
            {() => <CalendarTab competitionId={id} navigation={navigation} />}
          </Tab.Screen>
          <Tab.Screen
            name="Brackets"
            options={{ title: 'Llaves' }}
            initialParams={{ competitionId: id }}
          >
            {() => <BracketsTab competitionId={id} />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </CompetitionDetailCtx.Provider>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  hero: { height: 200 },
  heroOv: {
    flex: 1,
    backgroundColor: 'rgba(11,14,26,0.8)',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backIcon: { marginBottom: 12 },
  heroBody: { flex: 1, justifyContent: 'flex-end' },
  heroTags: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  tagT: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  heroT: { color: C.w, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroMeta: { flexDirection: 'row', gap: 14 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaT: { color: C.t1, fontSize: 12 },

  errorT: {
    color: C.t1,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  backT: { color: C.bg, fontWeight: '700' },
});
