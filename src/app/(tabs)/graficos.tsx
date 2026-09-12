import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHART_TIME_LABELS, LineChart } from '@/components/estufa/charts';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import {
  CHART_SERIES,
  CHART_STATS,
  SENSOR_META,
  TIME_RANGES,
  type SensorKey,
  type TimeRange,
} from '@/data/mock';

const SENSOR_KEYS = Object.keys(SENSOR_META) as SensorKey[];

export default function GraficosScreen() {
  const insets = useSafeAreaInsets();
  const [sensor, setSensor] = useState<SensorKey>('temperatura');
  const [range, setRange] = useState<TimeRange>('24h');
  const [compare, setCompare] = useState(false);

  const meta = SENSOR_META[sensor];
  const stats = CHART_STATS[sensor];
  const series = CHART_SERIES[sensor];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Gráficos</Text>
          <Text style={styles.subtitle}>Acompanhe a evolução dos sensores</Text>
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
                onPress={() => setRange(item)}
                style={[styles.rangeBtn, active && styles.rangeBtnActive]}>
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
            <Text style={styles.chartTitle}>{meta.label}</Text>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Média" value={`${stats.avg} ${meta.unit}`} />
            <Stat label="Min" value={`${stats.min} ${meta.unit}`} />
            <Stat label="Máx" value={`${stats.max} ${meta.unit}`} />
          </View>

          <LineChart data={series} color={EstufaColors.primary} height={200} />
          <View style={styles.labelsRow}>
            {CHART_TIME_LABELS.map((label) => (
              <Text key={label} style={styles.axisLabel}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>Comparar sensores</Text>
          <Switch
            value={compare}
            onValueChange={setCompare}
            trackColor={{ false: EstufaColors.switchTrackOff, true: EstufaColors.primary }}
            thumbColor={EstufaColors.white}
          />
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
  screen: {
    flex: 1,
    backgroundColor: EstufaColors.background,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.two,
    gap: 4,
  },
  title: {
    color: EstufaColors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
  },
  chips: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: EstufaColors.surface,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  chipActive: {
    backgroundColor: EstufaColors.primary,
    borderColor: EstufaColors.primary,
  },
  chipText: {
    color: EstufaColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#052e16',
  },
  ranges: {
    flexDirection: 'row',
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },
  rangeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  rangeBtnActive: {
    backgroundColor: EstufaColors.primaryMuted,
  },
  rangeText: {
    color: EstufaColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  rangeTextActive: {
    color: EstufaColors.primary,
  },
  chartCard: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    color: EstufaColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    gap: 2,
  },
  statLabel: {
    color: EstufaColors.textMuted,
    fontSize: 12,
  },
  statValue: {
    color: EstufaColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  axisLabel: {
    color: EstufaColors.textMuted,
    fontSize: 11,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  compareLabel: {
    color: EstufaColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
