import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import { captureException } from '../lib/sentry';
import { C, IMG } from '../utils/theme';

const POS_MAP: Record<string, { icon: string; label: string }> = {
  GOALKEEPER: { icon: 'hand-left', label: 'Portero' },
  DEFENDER: { icon: 'shield-half-full', label: 'Defensa' },
  MIDFIELDER: { icon: 'strategy', label: 'Centrocampista' },
  FORWARD: { icon: 'lightning-bolt', label: 'Delantero' },
};

export function ProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await userApi.getMe();
      setProfile(r.data);
    } catch (err) {
      captureException(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <View style={[s.c, s.ctr]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  const m = profile?.medals || {};
  const st = profile?.stats || {};
  const pos = POS_MAP[profile?.position || ''] || { icon: 'soccer', label: profile?.position };

  return (
    <ScrollView
      style={s.c}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={C.primary}
        />
      }
    >
      <ImageBackground source={{ uri: IMG.grass }} style={s.heroBg} resizeMode="cover">
        <View style={s.heroOv}>
          <View style={s.avatarRing}>
            <Text style={s.avatarLetter}>{(profile?.nickname || 'J')[0].toUpperCase()}</Text>
          </View>
          <Text style={s.nick}>{profile?.nickname || 'Jugador'}</Text>
          <View style={s.posChip}>
            <MaterialCommunityIcons name={pos.icon as any} size={14} color={C.primary} />
            <Text style={s.posLabel}>{pos.label}</Text>
          </View>
          {profile?.city && (
            <View style={s.cityRow}>
              <Ionicons name="location" size={12} color={C.t2} />
              <Text style={s.cityText}>{profile.city}</Text>
            </View>
          )}
        </View>
      </ImageBackground>

      <View style={s.body}>
        {/* Rating */}
        {st.avgRating > 0 && (
          <View style={s.ratingCard}>
            <View style={s.ratingLeft}>
              <Text style={s.ratingNum}>{st.avgRating}</Text>
              <Text style={s.ratingOf}>/10</Text>
            </View>
            <View style={s.ratingRight}>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(st.avgRating / 2) ? 'star' : 'star-outline'}
                    size={16}
                    color={C.gold}
                  />
                ))}
              </View>
              <Text style={s.ratingVotes}>{st.totalVotesReceived} valoraciones</Text>
            </View>
          </View>
        )}

        {profile?.bio && (
          <View style={s.bioCard}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={C.t3}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text style={s.bioText}>{profile.bio}</Text>
          </View>
        )}

        <Text style={s.section}>Estadísticas</Text>
        <View style={s.grid}>
          <Stat icon="football" color={C.primary} val={m.totalGoals || 0} label="Goles" />
          <Stat
            icon="git-merge-outline"
            color={C.blue}
            val={m.totalAssists || 0}
            label="Asistencias"
          />
          <Stat icon="trophy" color={C.gold} val={m.mvpCount || 0} label="MVP" />
          <Stat icon="calendar" color={C.purple} val={m.matchesPlayed || 0} label="Partidos" />
          <StatCustom
            icon="card"
            color={C.orange}
            val={m.totalYellowCards || 0}
            label="Amarillas"
          />
          <StatCustom icon="card" color={C.red} val={m.totalRedCards || 0} label="Rojas" />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={C.red} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Stat({
  icon,
  color,
  val,
  label,
}: {
  icon: any;
  color: string;
  val: number;
  label: string;
}) {
  return (
    <View style={[gs.card, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[gs.val, { color }]}>{val}</Text>
      <Text style={gs.label}>{label}</Text>
    </View>
  );
}

function StatCustom({
  icon,
  color,
  val,
  label,
}: {
  icon: string;
  color: string;
  val: number;
  label: string;
}) {
  return (
    <View style={[gs.card, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={[gs.val, { color }]}>{val}</Text>
      <Text style={gs.label}>{label}</Text>
    </View>
  );
}

const gs = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '31%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    gap: 4,
  },
  val: { fontSize: 22, fontWeight: '900' },
  label: { color: C.t3, fontSize: 10, fontWeight: '600' },
});

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  ctr: { justifyContent: 'center', alignItems: 'center' },
  heroBg: { height: 250 },
  heroOv: {
    flex: 1,
    backgroundColor: 'rgba(11,14,26,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetter: { color: C.primary, fontSize: 30, fontWeight: '800' },
  nick: { color: C.w, fontSize: 22, fontWeight: '800' },
  posChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
  },
  posLabel: { color: C.primary, fontSize: 12, fontWeight: '700' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cityText: { color: C.t2, fontSize: 12 },

  body: {
    padding: 18,
    marginTop: -16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: C.bg,
  },
  ratingCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  ratingLeft: { flexDirection: 'row', alignItems: 'baseline', marginRight: 18 },
  ratingNum: { color: C.gold, fontSize: 38, fontWeight: '900' },
  ratingOf: { color: C.t3, fontSize: 16, marginLeft: 2 },
  ratingRight: { flex: 1 },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  ratingVotes: { color: C.t2, fontSize: 12 },

  bioCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  bioText: { color: C.t2, fontSize: 13, flex: 1, lineHeight: 19 },

  section: { color: C.w, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.redMuted,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.25)',
  },
  logoutText: { color: C.red, fontWeight: '600', fontSize: 14 },
});
