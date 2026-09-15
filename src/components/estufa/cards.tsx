import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Sparkline } from '@/components/estufa/charts';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import type { EquipmentId } from '@/context/estufa-context';
import { EQUIPMENT_META, SENSOR_META, type SensorKey } from '@/data/mock';

export function SensorCard({
  sensorKey,
  value,
  sparkline,
  subtitle,
}: {
  sensorKey: SensorKey;
  value: number | null;
  sparkline: number[];
  subtitle?: string | null;
}) {
  const meta = SENSOR_META[sensorKey];
  const display =
    value == null || Number.isNaN(value)
      ? '—'
      : Number.isInteger(value)
        ? `${value}`
        : value.toFixed(1);

  return (
    <View style={styles.sensorCard}>
      <View style={styles.sensorHeader}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
        <Text style={styles.sensorLabel} numberOfLines={1}>
          {meta.label}
        </Text>
      </View>
      <Text style={styles.sensorValue}>
        {display}
        {value != null ? <Text style={styles.sensorUnit}> {meta.unit}</Text> : null}
      </Text>
      {subtitle ? <Text style={styles.sensorSubtitle}>{subtitle}</Text> : null}
      <Sparkline data={sparkline} color={meta.color} />
    </View>
  );
}

export function EquipmentQuickCard({
  id,
  on,
  onToggle,
  onPress,
}: {
  id: EquipmentId;
  on: boolean;
  onToggle: (value: boolean) => void;
  onPress?: () => void;
}) {
  const meta = EQUIPMENT_META[id];

  return (
    <Pressable
      style={[styles.equipCard, on && styles.equipCardOn]}
      onPress={onPress}>
      <View
        style={[
          styles.equipIcon,
          { backgroundColor: on ? EstufaColors.primaryMuted : `${meta.color}22` },
        ]}>
        <Ionicons name={meta.icon} size={18} color={on ? EstufaColors.primary : meta.color} />
      </View>
      <Text style={styles.equipTitle}>{meta.shortLabel}</Text>
      <Text style={[styles.equipStatus, on && styles.equipStatusOn]}>{on ? 'Ligada' : 'Desligada'}</Text>
      <Switch
        value={on}
        onValueChange={onToggle}
        trackColor={{ false: EstufaColors.switchTrackOff, true: EstufaColors.primary }}
        thumbColor={on ? EstufaColors.primary : EstufaColors.white}
        ios_backgroundColor={EstufaColors.switchTrackOff}
        style={styles.switch}
      />
    </Pressable>
  );
}

export function EquipmentRow({
  id,
  on,
  onToggle,
}: {
  id: EquipmentId;
  on: boolean;
  onToggle: (value: boolean) => void;
}) {
  const meta = EQUIPMENT_META[id];

  return (
    <View style={[styles.equipRow, on && styles.equipRowOn]}>
      <View
        style={[
          styles.equipRowIcon,
          { backgroundColor: on ? EstufaColors.primaryMuted : `${meta.color}22` },
        ]}>
        <Ionicons name={meta.icon} size={26} color={on ? EstufaColors.primary : meta.color} />
      </View>
      <View style={styles.equipRowBody}>
        <Text style={styles.equipRowTitle}>{meta.label}</Text>
        <Text style={[styles.equipRowStatus, on && styles.equipStatusOn]}>{on ? 'Ligada' : 'Desligada'}</Text>
        <Text style={styles.equipRowDesc}>{meta.description}</Text>
      </View>
      <Switch
        value={on}
        onValueChange={onToggle}
        trackColor={{ false: EstufaColors.switchTrackOff, true: EstufaColors.primary }}
        thumbColor={on ? EstufaColors.primary : EstufaColors.white}
        ios_backgroundColor={EstufaColors.switchTrackOff}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sensorCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sensorLabel: {
    color: EstufaColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  sensorValue: {
    color: EstufaColors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  sensorUnit: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  sensorSubtitle: {
    color: EstufaColors.textMuted,
    fontSize: 11,
    marginTop: -4,
  },
  equipCard: {
    flex: 1,
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 6,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  equipCardOn: {
    backgroundColor: EstufaColors.primaryMuted,
    borderColor: 'rgba(74, 222, 128, 0.45)',
  },
  equipIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipTitle: {
    color: EstufaColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  equipStatus: {
    color: EstufaColors.textMuted,
    fontSize: 12,
  },
  equipStatusOn: {
    color: EstufaColors.primary,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
    marginLeft: -4,
  },
  equipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  equipRowOn: {
    backgroundColor: EstufaColors.primaryMuted,
    borderColor: 'rgba(74, 222, 128, 0.45)',
  },
  equipRowIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipRowBody: {
    flex: 1,
    gap: 2,
  },
  equipRowTitle: {
    color: EstufaColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  equipRowStatus: {
    color: EstufaColors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  equipRowDesc: {
    color: EstufaColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
