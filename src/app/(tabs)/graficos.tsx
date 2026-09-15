import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
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

import { LineChart } from '@/components/estufa/charts';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa } from '@/context/estufa-context';
import { DEVICE_ID, isSupabaseConfigured } from '@/lib/config';
import { formatOptionalNumber } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { SENSOR_META, TIME_RANGES, type SensorKey, type TimeRange } from '@/data/mock';
import { fetchHistorySince } from '@/services/greenhouse';
import type { SensorHistoryRow } from '@/types/supabase';

const SENSOR_KEYS = Object.keys(SENSOR_META) as SensorKey[];

const SENSOR_COLUMN: Record<SensorKey, keyof SensorHistoryRow> = {
  temperatura: 'temperature',
  umidadeAr: 'air_humidity',
  umidadeSolo: 'soil_moisture',
  luminosidade: 'light',
};

const RANGE_MS: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7 dias': 7 * 24 * 60 * 60 * 1000,
};

const RANGE_LABELS: Record<TimeRange, string> = {
  '1h': '1 hora',
  '6h': '6 horas',
  '24h': '1 dia',
  '7 dias': '7 dias',
};

const MAX_CHART_POINTS = 48;

type LoadMode = 'initial' | 'refresh' | 'silent';

function rangeToSince(range: TimeRange): string {
  return new Date(Date.now() - RANGE_MS[range]).toISOString();
}

function valuesForSensor(rows: SensorHistoryRow[], sensor: SensorKey): number[] {
  const column = SENSOR_COLUMN[sensor];
  return rows
    .map((row) => {
      const value = row[column];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value != null);
}

function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values;
  const result: number[] = [];
  const step = (values.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    result.push(values[Math.round(i * step)]);
  }
  return result;
}

function computeStats(values: number[]): { avg: string; min: string; max: string } {
  if (values.length === 0) {
    return { avg: '—', min: '—', max: '—' };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const digits = min % 1 !== 0 || max % 1 !== 0 || avg % 1 !== 0 ? 1 : 0;
  return {
    avg: formatOptionalNumber(avg, digits),
    min: formatOptionalNumber(min, digits),
    max: formatOptionalNumber(max, digits),
  };
}

function chartLabels(range: TimeRange): string[] {
  if (range === '1h') return ['há 1h', '45 min', '30 min', '15 min', 'agora'];
  if (range === '6h') return ['há 6h', 'há 4h', 'há 3h', 'há 1h', 'agora'];
  if (range === '7 dias') return ['há 7 dias', 'há 5 dias', 'há 3 dias', 'ontem', 'hoje'];
  return ['há 1 dia', 'há 18h', 'há 12h', 'há 6h', 'agora'];
}

export default function GraficosScreen() {
  const insets = useSafeAreaInsets();
  const { sensors } = useEstufa();
  const [sensor, setSensor] = useState<SensorKey>('temperatura');
  const [range, setRange] = useState<TimeRange>('24h');
  const [rows, setRows] = useState<SensorHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const meta = SENSOR_META[sensor];
  const live = sensors[sensor];

  const loadChart = useCallback(async (mode: LoadMode = 'initial', nextRange?: TimeRange) => {
    if (!isSupabaseConfigured) {
      setRows([]);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Troca de período (initial/refresh) cancela o bloqueio de silent in-flight.
    if (inFlightRef.current && mode === 'silent') return;
    inFlightRef.current = true;

    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial') setLoading(true);

    const activeRange = nextRange ?? rangeRef.current;

    try {
      const data = await fetchHistorySince(DEVICE_ID, rangeToSince(activeRange), 1000);
      setRows(data);
      setError(null);
      hasLoadedRef.current = true;
    } catch {
      setError('Não foi possível carregar os gráficos. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  const onSelectRange = useCallback(
    (item: TimeRange) => {
      setRange(item);
      hasLoadedRef.current = false;
      void loadChart('initial', item);
    },
    [loadChart]
  );

  useFocusEffect(
    useCallback(() => {
      void loadChart(hasLoadedRef.current ? 'silent' : 'initial');

      const supabase = getSupabase();
      if (!supabase) return;

      const channel = supabase
        .channel(`sensor_history:${DEVICE_ID}:charts`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_history',
            filter: `device_id=eq.${DEVICE_ID}`,
          },
          () => {
            void loadChart('silent');
          }
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }, [loadChart])
  );

  const seriesValues = useMemo(() => valuesForSensor(rows, sensor), [rows, sensor]);
  const chartData = useMemo(
    () => downsample(seriesValues, MAX_CHART_POINTS),
    [seriesValues]
  );
  const stats = useMemo(() => computeStats(seriesValues), [seriesValues]);

  const emptyMessage = !isSupabaseConfigured
    ? 'Conexão com a nuvem não configurada. Não é possível mostrar o histórico agora.'
    : 'Ainda não há medições neste período. Experimente um intervalo maior.';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadChart('refresh')}
            tintColor={EstufaColors.primary}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Gráficos</Text>
          <Text style={styles.subtitle}>
            Acompanhe as medições ao longo do tempo
            {live != null ? ` · agora ${live}${meta.unit}` : ''}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SENSOR_KEYS.map((key) => {
            const active = key === sensor;
            return (
              <Pressable
                key={key}
                onPress={() => setSensor(key)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {SENSOR_META[key].label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.ranges}>
          {TIME_RANGES.map((item) => {
            const active = item === range;
            return (
              <Pressable
                key={item}
                onPress={() => onSelectRange(item)}
                style={[styles.rangeBtn, active && styles.rangeBtnActive]}>
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {RANGE_LABELS[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
            <Text style={styles.chartTitle}>{meta.label}</Text>
          </View>

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={EstufaColors.primary} />
              <Text style={styles.stateText}>Carregando…</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBox}>
              <Ionicons name="cloud-offline-outline" size={24} color={EstufaColors.textMuted} />
              <Text style={styles.stateText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void loadChart('initial')}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : seriesValues.length === 0 ? (
            <View style={styles.stateBox}>
              <Ionicons name="analytics-outline" size={24} color={EstufaColors.textMuted} />
              <Text style={styles.stateText}>{emptyMessage}</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <Stat label="Média" value={`${stats.avg} ${meta.unit}`} />
                <Stat label="Mínima" value={`${stats.min} ${meta.unit}`} />
                <Stat label="Máxima" value={`${stats.max} ${meta.unit}`} />
              </View>
              <LineChart
                data={chartData}
                color={meta.color}
                height={200}
                labels={chartLabels(range)}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: EstufaColors.background },
  content: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  header: { paddingTop: Spacing.two, gap: 4 },
  title: { color: EstufaColors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: EstufaColors.textSecondary, fontSize: 14 },
  chips: { gap: Spacing.two },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: EstufaColors.surface,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  chipActive: { backgroundColor: EstufaColors.primary, borderColor: EstufaColors.primary },
  chipText: { color: EstufaColors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#052e16' },
  ranges: {
    flexDirection: 'row',
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md },
  rangeBtnActive: { backgroundColor: EstufaColors.primaryMuted },
  rangeText: { color: EstufaColors.textMuted, fontSize: 12, fontWeight: '600' },
  rangeTextActive: { color: EstufaColors.primary },
  chartCard: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartTitle: { color: EstufaColors.text, fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { gap: 2 },
  statLabel: { color: EstufaColors.textMuted, fontSize: 12 },
  statValue: { color: EstufaColors.text, fontSize: 14, fontWeight: '600' },
  stateBox: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  stateText: {
    color: EstufaColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
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
