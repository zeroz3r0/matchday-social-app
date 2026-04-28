// ============================================================================
// CompetitionListScreen — Browse competitions with filter chips + pagination
// ============================================================================
// Filters: type (LEAGUE/TOURNAMENT/Todos), gameType (F5/F7/F11/Todos), city
// (debounced text input). Cursor pagination via "Cargar más" footer.
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { competitionApi } from '../services/api';
import type { WireCompetition } from '../services/api';
import { captureException } from '../lib/sentry';
import { ErrorView } from '../components/ErrorView';
import type { CompetitionStackParamList } from '../navigation/RootNavigator';
import { C, IMG, GAME_COLORS } from '../utils/theme';

type CompetitionType = 'LEAGUE' | 'TOURNAMENT';
type CompetitionGameType = 'F5' | 'F7' | 'F11';

const TYPE_LABEL: Record<CompetitionType, string> = {
  LEAGUE: 'Liga',
  TOURNAMENT: 'Torneo',
};

interface Filters {
  type: CompetitionType | null;
  gameType: CompetitionGameType | null;
  city: string;
}

// In-file debounce hook — no extra dep (per design §1.5).
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

type Props = NativeStackScreenProps<CompetitionStackParamList, 'CompetitionList'>;

export function CompetitionListScreen({ navigation }: Props) {
  const [data, setData] = useState<WireCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState<Filters>({ type: null, gameType: null, city: '' });
  const debouncedCity = useDebounced(filters.city, 300);

  const buildParams = (cursor?: string) => {
    const params: {
      type?: CompetitionType;
      gameType?: CompetitionGameType;
      city?: string;
      cursor?: string;
    } = {};
    if (filters.type !== null) params.type = filters.type;
    if (filters.gameType !== null) params.gameType = filters.gameType;
    if (debouncedCity.trim() !== '') params.city = debouncedCity.trim();
    if (cursor !== undefined) params.cursor = cursor;
    return params;
  };

  const fetchPage = async (mode: 'initial' | 'refresh' | 'more') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);
    setError(null);
    try {
      const cursor = mode === 'more' && nextCursor !== null ? nextCursor : undefined;
      const result = await competitionApi.list(buildParams(cursor));
      if (mode === 'more') {
        setData((prev) => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      setNextCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch (err) {
      captureException(err);
      const message =
        err instanceof Error ? err.message : 'No se pudieron cargar las competiciones';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch + refetch on filter change.
  useEffect(() => {
    fetchPage('initial');
  }, [filters.type, filters.gameType, debouncedCity]);

  // Refetch on focus (so newly created comps appear).
  useEffect(() => {
    const u = navigation.addListener('focus', () => {
      fetchPage('initial');
    });
    return u;
  }, [navigation]);

  const filtersActive =
    filters.type !== null || filters.gameType !== null || debouncedCity.trim() !== '';

  const renderItem = ({ item }: { item: WireCompetition }) => {
    const gc = GAME_COLORS[item.gameType] ?? GAME_COLORS.F7!;
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CompetitionDetail', { id: item.id })}
      >
        <View style={[s.accentBar, { backgroundColor: gc.accent }]} />
        <View style={s.cardBody}>
          <View style={s.cardHead}>
            <View style={[s.tag, { backgroundColor: gc.bg }]}>
              <Text style={[s.tagT, { color: gc.accent }]}>{item.gameType}</Text>
            </View>
            <View style={[s.tag, { backgroundColor: C.surface }]}>
              <Text style={[s.tagT, { color: C.t1 }]}>
                {TYPE_LABEL[item.type as CompetitionType]}
              </Text>
            </View>
          </View>

          <Text style={s.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={s.cardMeta}>
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={13} color={C.t3} />
              <Text style={s.metaT}>{item.city}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.c}>
      <ImageBackground source={{ uri: IMG.field }} style={s.hero} resizeMode="cover">
        <View style={s.heroOv}>
          <View>
            <Text style={s.heroT}>Competiciones</Text>
            <Text style={s.heroS}>Ligas y torneos cerca tuyo</Text>
          </View>
          <TouchableOpacity
            style={s.heroBtn}
            onPress={() => navigation.navigate('CompetitionCreate')}
          >
            <Ionicons name="add" size={20} color={C.bg} />
            <Text style={s.heroBtnT}>Crear</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* Filters */}
      <View style={s.filtersWrap}>
        <View style={s.chipRow}>
          <Chip
            label="Todos"
            active={filters.type === null}
            onPress={() => setFilters((f) => ({ ...f, type: null }))}
          />
          <Chip
            label="Ligas"
            active={filters.type === 'LEAGUE'}
            onPress={() => setFilters((f) => ({ ...f, type: 'LEAGUE' }))}
          />
          <Chip
            label="Torneos"
            active={filters.type === 'TOURNAMENT'}
            onPress={() => setFilters((f) => ({ ...f, type: 'TOURNAMENT' }))}
          />
        </View>
        <View style={s.chipRow}>
          <Chip
            label="Todas"
            active={filters.gameType === null}
            onPress={() => setFilters((f) => ({ ...f, gameType: null }))}
          />
          <Chip
            label="F5"
            active={filters.gameType === 'F5'}
            onPress={() => setFilters((f) => ({ ...f, gameType: 'F5' }))}
          />
          <Chip
            label="F7"
            active={filters.gameType === 'F7'}
            onPress={() => setFilters((f) => ({ ...f, gameType: 'F7' }))}
          />
          <Chip
            label="F11"
            active={filters.gameType === 'F11'}
            onPress={() => setFilters((f) => ({ ...f, gameType: 'F11' }))}
          />
        </View>
        <View style={s.cityField}>
          <Ionicons name="search" size={16} color={C.t3} style={{ paddingLeft: 12 }} />
          <TextInput
            style={s.cityInput}
            placeholder="Buscar por ciudad..."
            placeholderTextColor={C.t3}
            value={filters.city}
            onChangeText={(text) => setFilters((f) => ({ ...f, city: text }))}
            autoCapitalize="words"
          />
        </View>
      </View>

      {loading ? (
        <View style={[s.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error !== null ? (
        <ErrorView message={error} retry={() => fetchPage('initial')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPage('refresh')}
              tintColor={C.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="trophy-outline" size={56} color={C.t3} />
              <Text style={s.emptyT}>
                {filtersActive ? "Sin resultados pa' estos filtros." : 'Aún no hay competiciones.'}
              </Text>
              {!filtersActive && <Text style={s.emptyH}>¡Sé el primero en crear una!</Text>}
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={s.moreBtn}
                onPress={() => fetchPage('more')}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={C.bg} />
                ) : (
                  <Text style={s.moreT}>Cargar más</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipOn]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.chipT, active && s.chipTOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  hero: { height: 130 },
  heroOv: {
    flex: 1,
    backgroundColor: 'rgba(11,14,26,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  heroT: { color: C.w, fontSize: 24, fontWeight: '800' },
  heroS: { color: C.t2, fontSize: 13, marginTop: 2 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  heroBtnT: { color: C.bg, fontWeight: '700', fontSize: 13 },

  filtersWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipT: { color: C.t2, fontSize: 12, fontWeight: '600' },
  chipTOn: { color: C.bg },
  cityField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  cityInput: { flex: 1, color: C.w, padding: 10, fontSize: 13 },

  center: { justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  accentBar: { height: 3 },
  cardBody: { padding: 16 },
  cardHead: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  tagT: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  cardTitle: { color: C.w, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaT: { color: C.t3, fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyT: { color: C.t1, fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptyH: { color: C.t2, fontSize: 13, marginTop: 6, textAlign: 'center' },

  errorT: {
    color: C.t1,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  retryT: { color: C.bg, fontWeight: '700' },

  moreBtn: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  moreT: { color: C.bg, fontWeight: '700', fontSize: 14 },
});
