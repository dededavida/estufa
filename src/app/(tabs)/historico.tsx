import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa } from '@/context/estufa-context';
import { DEVICE_ID, isSupabaseConfigured } from '@/lib/config';
import { formatHistoryTime, formatOptionalNumber } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { fetchHistoryForDay } from '@/services/greenhouse';
import type { SensorHistoryRow } from '@/types/supabase';

type LoadMode = 'initial' | 'refresh' | 'silent';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return startOfDay(d);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  if (isSameDay(date, today)) return 'Hoje';
  if (isSameDay(date, addDays(today, -1))) return 'Ontem';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function HistoricoScreen() {
  const insets = useSafeAreaInsets();
  const { sensors, lastUpdate } = useEstufa();

  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [rows, setRows] = useState<SensorHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const selectedDayRef = useRef(selectedDay);
  selectedDayRef.current = selectedDay;

  const loadHistory = useCallback(async (mode: LoadMode = 'initial', day?: Date) => {
    if (!isSupabaseConfigured) {
      setRows([]);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial') setLoading(true);

    const dayToLoad = day ?? selectedDayRef.current;

    try {
      const data = await fetchHistoryForDay(DEVICE_ID, dayToLoad);
      setRows(data);
      setError(null);
      hasLoadedRef.current = true;
    } catch {
      setError('Não foi possível carregar o histórico. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  const selectDay = useCallback(
    (day: Date) => {
      const next = startOfDay(day);
      setSelectedDay(next);
      hasLoadedRef.current = false;
      void loadHistory('initial', next);
    },
    [loadHistory]
  );

  useFocusEffect(
    useCallback(() => {
      void loadHistory(hasLoadedRef.current ? 'silent' : 'initial');

      const supabase = getSupabase();
      if (!supabase) return;

      const channel = supabase
        .channel(`sensor_history:${DEVICE_ID}:day`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_history',
            filter: `device_id=eq.${DEVICE_ID}`,
          },
          () => {
            if (isSameDay(selectedDayRef.current, startOfDay(new Date()))) {
              void loadHistory('silent');
            }
          }
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }, [loadHistory])
  );

  const today = startOfDay(new Date());
  const isToday = isSameDay(selectedDay, today);
  const canGoNext = !isToday;

  const emptyMessage = !isSupabaseConfigured
    ? 'Supabase não configurado. Preencha o arquivo .env para ver o histórico.'
    : `Nenhuma leitura em ${formatDayLabel(selectedDay).toLowerCase()}.`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHistory('refresh')}
            tintColor={EstufaColors.primary}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Histórico</Text>
          <Text style={styles.subtitle}>Leituras sincronizadas com a nuvem</Text>
        </View>

        <View style={styles.dayFilter}>
          <Pressable
            style={styles.dayArrow}
            onPress={() => selectDay(addDays(selectedDay, -1))}
            hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={EstufaColors.text} />
          </Pressable>

          <View style={styles.dayCenter}>
            <Text style={styles.dayLabel}>{formatDayLabel(selectedDay)}</Text>
            <View style={styles.dayChips}>
              <Pressable
                style={[styles.chip, isToday && styles.chipActive]}
                onPress={() => selectDay(today)}>
                <Text style={[styles.chipText, isToday && styles.chipTextActive]}>Hoje</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  isSameDay(selectedDay, addDays(today, -1)) && styles.chipActive,
                ]}
                onPress={() => selectDay(addDays(today, -1))}>
                <Text
                  style={[
                    styles.chipText,
                    isSameDay(selectedDay, addDays(today, -1)) && styles.chipTextActive,
                  ]}>
                  Ontem
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.dayArrow, !canGoNext && styles.dayArrowDisabled]}
            onPress={() => {
              if (canGoNext) selectDay(addDays(selectedDay, 1));
            }}
            disabled={!canGoNext}
            hitSlop={8}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={canGoNext ? EstufaColors.text : EstufaColors.textMuted}
            />
          </Pressable>
        </View>

        <View style={styles.liveCard}>
          <Text style={styles.liveTitle}>Agora ({lastUpdate})</Text>
          <Text style={styles.liveValues}>
            Temp {sensors.temperatura ?? '—'}°C · Ar {sensors.umidadeAr ?? '—'}% · Solo{' '}
            {sensors.umidadeSolo ?? '—'}% · Luz {sensors.luminosidade ?? '—'}%
          </Text>
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={EstufaColors.primary} />
            <Text style={styles.stateText}>Carregando histórico…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={EstufaColors.textMuted} />
            <Text style={styles.stateText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void loadHistory('initial')}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="time-outline" size={28} color={EstufaColors.textMuted} />
            <Text style={styles.stateText}>{emptyMessage}</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, styles.timeCol]}>Hora</Text>
              <Text style={[styles.cell, styles.headerCell]}>Temp.</Text>
              <Text style={[styles.cell, styles.headerCell]}>Umid.</Text>
              <Text style={[styles.cell, styles.headerCell]}>Solo</Text>
              <Text style={[styles.cell, styles.headerCell]}>Luz</Text>
            </View>
            {rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <Text style={[styles.cell, styles.timeCol, styles.timeCell]}>
                  {formatHistoryTime(row.created_at)}
                </Text>
                <Text style={styles.cell}>{formatOptionalNumber(row.temperature, 1)}</Text>
                <Text style={styles.cell}>{formatOptionalNumber(row.air_humidity)}</Text>
                <Text style={styles.cell}>{formatOptionalNumber(row.soil_moisture)}</Text>
                <Text style={styles.cell}>{formatOptionalNumber(row.light)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: EstufaColors.background },
  content: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  header: { paddingTop: Spacing.two, gap: 4 },
  title: { color: EstufaColors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: EstufaColors.textSecondary, fontSize: 14 },
  dayFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  dayArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EstufaColors.surfaceElevated,
  },
  dayArrowDisabled: { opacity: 0.45 },
  dayCenter: { flex: 1, alignItems: 'center', gap: 8 },
  dayLabel: { color: EstufaColors.text, fontSize: 16, fontWeight: '700' },
  dayChips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: EstufaColors.surfaceElevated,
  },
  chipActive: { backgroundColor: EstufaColors.primaryMuted },
  chipText: { color: EstufaColors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: EstufaColors.primary },
  liveCard: {
    backgroundColor: EstufaColors.primaryMuted,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 6,
  },
  liveTitle: { color: EstufaColors.primary, fontWeight: '700', fontSize: 13 },
  liveValues: { color: EstufaColors.text, fontSize: 13, lineHeight: 18 },
  table: { backgroundColor: EstufaColors.surface, borderRadius: Radius.xl, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: EstufaColors.border,
  },
  headerRow: { backgroundColor: EstufaColors.surfaceElevated },
  cell: { flex: 1, color: EstufaColors.text, fontSize: 13, textAlign: 'center' },
  headerCell: {
    color: EstufaColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeCol: { flex: 1.1, textAlign: 'left', paddingLeft: 6 },
  timeCell: { color: EstufaColors.primary, fontWeight: '600' },
  stateBox: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  stateText: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.one,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: EstufaColors.primaryMuted,
  },
  retryText: { color: EstufaColors.primary, fontWeight: '700', fontSize: 13 },
});
