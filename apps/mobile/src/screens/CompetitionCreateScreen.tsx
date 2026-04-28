// ============================================================================
// CompetitionCreateScreen — Create a new competition (LEAGUE / TOURNAMENT)
// ============================================================================
// Form per design §1.13 (controlled useState mirroring CreateMatchScreen).
// Date pickers via @react-native-community/datetimepicker (Batch 1 dep).
// Submit calls competitionApi.create with ISO strings; lat/lng hardcoded to
// Madrid (40.4168 / -3.7038) matching CreateMatchScreen tech debt.
// React Compiler memoizes — no useCallback / useMemo here.
// ============================================================================

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { competitionApi } from '../services/api';
import { showAlert } from '../utils/alert';
import type { CompetitionStackParamList } from '../navigation/RootNavigator';
import { C } from '../utils/theme';

type CompetitionType = 'LEAGUE' | 'TOURNAMENT';
type CompetitionGameType = 'F5' | 'F7' | 'F11';

interface FieldErrors {
  name?: string;
  city?: string;
  startDate?: string;
  minClubs?: string;
  maxClubs?: string;
  general?: string;
}

const TYPE_OPTIONS: { value: CompetitionType; label: string }[] = [
  { value: 'LEAGUE', label: 'Liga' },
  { value: 'TOURNAMENT', label: 'Torneo' },
];

const GAME_TYPE_OPTIONS: CompetitionGameType[] = ['F5', 'F7', 'F11'];

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type Props = NativeStackScreenProps<CompetitionStackParamList, 'CompetitionCreate'>;

export function CompetitionCreateScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CompetitionType>('LEAGUE');
  const [gameType, setGameType] = useState<CompetitionGameType>('F7');
  const [city, setCity] = useState('');
  const [minClubs, setMinClubs] = useState('4');
  const [maxClubs, setMaxClubs] = useState('16');
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (name.trim().length < 3) {
      e.name = 'El nombre debe tener al menos 3 caracteres';
    }
    if (city.trim() === '') {
      e.city = 'Ciudad requerida';
    }
    const minN = parseInt(minClubs, 10);
    const maxN = parseInt(maxClubs, 10);
    if (!Number.isFinite(minN) || minN < 2 || minN > 32) {
      e.minClubs = 'Entre 2 y 32';
    }
    if (!Number.isFinite(maxN) || maxN < 2 || maxN > 64) {
      e.maxClubs = 'Entre 2 y 64';
    }
    if (Number.isFinite(minN) && Number.isFinite(maxN) && minN > maxN) {
      e.maxClubs = 'Máximo debe ser ≥ mínimo';
    }
    if (startDate.getTime() <= Date.now()) {
      e.startDate = 'La fecha debe ser futura';
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const input: {
        name: string;
        type: CompetitionType;
        gameType: CompetitionGameType;
        description?: string;
        startDate: string;
        endDate?: string;
        latitude: number;
        longitude: number;
        city: string;
      } = {
        name: name.trim(),
        type,
        gameType,
        startDate: startDate.toISOString(),
        latitude: 40.4168,
        longitude: -3.7038,
        city: city.trim(),
      };
      if (description.trim() !== '') input.description = description.trim();
      if (endDate !== null) input.endDate = endDate.toISOString();

      await competitionApi.create(input);
      showAlert('¡Listo!', 'Competición creada', () => navigation.goBack());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la competición';
      setErrors({ general: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name="arrow-back" size={22} color={C.t2} />
      </TouchableOpacity>

      <Text style={s.title}>Crear competición</Text>

      <Text style={s.label}>Nombre *</Text>
      <View style={s.field}>
        <Ionicons name="trophy" size={18} color={C.t3} style={{ paddingLeft: 14 }} />
        <TextInput
          style={s.input}
          placeholder="Liga del barrio 2026"
          placeholderTextColor={C.t3}
          value={name}
          onChangeText={setName}
          maxLength={100}
        />
      </View>
      {errors.name !== undefined && <Text style={s.err}>{errors.name}</Text>}

      <Text style={s.label}>Descripción (opcional)</Text>
      <View style={s.field}>
        <Ionicons name="document-text" size={18} color={C.t3} style={{ paddingLeft: 14 }} />
        <TextInput
          style={[s.input, { height: 80 }]}
          placeholder="Detalles, reglas, premios..."
          placeholderTextColor={C.t3}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
        />
      </View>

      <Text style={s.label}>Tipo *</Text>
      <View style={s.row}>
        {TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optBtn, type === opt.value && s.optBtnOn]}
            onPress={() => setType(opt.value)}
          >
            <Text style={[s.optT, type === opt.value && s.optTOn]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Modalidad *</Text>
      <View style={s.row}>
        {GAME_TYPE_OPTIONS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[s.optBtn, gameType === g && s.optBtnOn]}
            onPress={() => setGameType(g)}
          >
            <Ionicons name="football" size={14} color={gameType === g ? C.bg : C.t3} />
            <Text style={[s.optT, gameType === g && s.optTOn]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Ciudad *</Text>
      <View style={s.field}>
        <Ionicons name="location" size={18} color={C.t3} style={{ paddingLeft: 14 }} />
        <TextInput
          style={s.input}
          placeholder="Madrid"
          placeholderTextColor={C.t3}
          value={city}
          onChangeText={setCity}
          maxLength={100}
        />
      </View>
      {errors.city !== undefined && <Text style={s.err}>{errors.city}</Text>}

      <View style={s.rowGap}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Mín. clubes</Text>
          <View style={s.field}>
            <TextInput
              style={[s.input, { paddingLeft: 14 }]}
              placeholder="4"
              placeholderTextColor={C.t3}
              value={minClubs}
              onChangeText={setMinClubs}
              keyboardType="number-pad"
            />
          </View>
          {errors.minClubs !== undefined && <Text style={s.err}>{errors.minClubs}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Máx. clubes</Text>
          <View style={s.field}>
            <TextInput
              style={[s.input, { paddingLeft: 14 }]}
              placeholder="16"
              placeholderTextColor={C.t3}
              value={maxClubs}
              onChangeText={setMaxClubs}
              keyboardType="number-pad"
            />
          </View>
          {errors.maxClubs !== undefined && <Text style={s.err}>{errors.maxClubs}</Text>}
        </View>
      </View>

      <Text style={s.label}>Fecha de inicio *</Text>
      <TouchableOpacity style={s.dateField} onPress={() => setShowStartPicker(true)}>
        <Ionicons name="calendar" size={18} color={C.t3} style={{ paddingLeft: 14 }} />
        <Text style={s.dateT}>{fmtDate(startDate)}</Text>
      </TouchableOpacity>
      {errors.startDate !== undefined && <Text style={s.err}>{errors.startDate}</Text>}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selected) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (selected !== undefined) setStartDate(selected);
          }}
          minimumDate={new Date()}
          locale="es-ES"
        />
      )}

      <Text style={s.label}>Fecha de fin (opcional)</Text>
      <View style={s.endRow}>
        <TouchableOpacity style={[s.dateField, { flex: 1 }]} onPress={() => setShowEndPicker(true)}>
          <Ionicons name="calendar" size={18} color={C.t3} style={{ paddingLeft: 14 }} />
          <Text style={s.dateT}>{endDate !== null ? fmtDate(endDate) : 'Sin definir'}</Text>
        </TouchableOpacity>
        {endDate !== null && (
          <TouchableOpacity onPress={() => setEndDate(null)} style={s.clearBtn}>
            <Ionicons name="close-circle" size={20} color={C.t3} />
          </TouchableOpacity>
        )}
      </View>
      {showEndPicker && (
        <DateTimePicker
          value={endDate ?? startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selected) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (selected !== undefined) setEndDate(selected);
          }}
          minimumDate={startDate}
          locale="es-ES"
        />
      )}

      {errors.general !== undefined && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={16} color={C.red} />
          <Text style={s.errorBoxT}>{errors.general}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.btn, submitting && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Ionicons name="add-circle" size={20} color={C.bg} />
        <Text style={s.btnT}>{submitting ? 'Creando...' : 'Crear competición'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  cc: { padding: 24, paddingTop: 50, paddingBottom: 80 },
  back: { marginBottom: 16 },
  title: { color: C.w, fontSize: 24, fontWeight: '800', marginBottom: 24 },
  label: { color: C.t2, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: { flex: 1, color: C.w, padding: 14, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  rowGap: { flexDirection: 'row', gap: 10 },
  optBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.card,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  optBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  optT: { color: C.t3, fontSize: 14, fontWeight: '700' },
  optTOn: { color: C.bg },

  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    gap: 10,
  },
  dateT: { color: C.w, fontSize: 14, fontWeight: '600' },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { padding: 6 },

  err: { color: C.red, fontSize: 12, marginTop: 4, marginLeft: 2 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.redMuted,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  errorBoxT: { color: C.red, fontSize: 13, fontWeight: '600', flex: 1 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 28,
  },
  btnT: { color: C.bg, fontSize: 15, fontWeight: '700' },
});
