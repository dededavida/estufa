import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { HISTORY_ROWS } from '@/data/mock';

const DATES = [
  '12 de setembro de 2025',
  '11 de setembro de 2025',
  '10 de setembro de 2025',
];

export default function HistoricoScreen() {
  const insets = useSafeAreaInsets();
  const [dateIndex, setDateIndex] = useState(0);

  const cycleDate = () => {
    setDateIndex((prev) => (prev + 1) % DATES.length);
  };

  const exportCsv = () => {
    Alert.alert('Exportar CSV', 'Os dados do dia selecionado serão exportados em breve.');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Histórico</Text>
          <Text style={styles.subtitle}>Registros dos sensores</Text>
        </View>

        <Pressable style={styles.datePicker} onPress={cycleDate}>
          <Ionicons name="calendar-outline" size={18} color={EstufaColors.primary} />
          <Text style={styles.dateText}>{DATES[dateIndex]}</Text>
          <Ionicons name="chevron-down" size={18} color={EstufaColors.textMuted} />
        </Pressable>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.timeCol]}>Hora</Text>
            <Text style={[styles.cell, styles.headerCell]}>Temp.</Text>
            <Text style={[styles.cell, styles.headerCell]}>Umid.</Text>
            <Text style={[styles.cell, styles.headerCell]}>Solo</Text>
            <Text style={[styles.cell, styles.headerCell]}>Luz</Text>
          </View>
          {HISTORY_ROWS.map((row) => (
            <View key={row.time} style={styles.row}>
              <Text style={[styles.cell, styles.timeCol, styles.timeCell]}>{row.time}</Text>
              <Text style={styles.cell}>{row.temperatura.toFixed(1)}</Text>
              <Text style={styles.cell}>{row.umidadeAr}</Text>
              <Text style={styles.cell}>{row.umidadeSolo}</Text>
              <Text style={styles.cell}>{row.luminosidade}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 72 }]}>
        <Pressable style={styles.exportBtn} onPress={exportCsv}>
          <Ionicons name="download-outline" size={20} color="#052e16" />
          <Text style={styles.exportText}>Exportar dados (CSV)</Text>
        </Pressable>
      </View>
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
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  dateText: {
    flex: 1,
    color: EstufaColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  table: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: EstufaColors.border,
  },
  headerRow: {
    backgroundColor: EstufaColors.surfaceElevated,
  },
  cell: {
    flex: 1,
    color: EstufaColors.text,
    fontSize: 13,
    textAlign: 'center',
  },
  headerCell: {
    color: EstufaColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeCol: {
    flex: 1.1,
    textAlign: 'left',
    paddingLeft: 6,
  },
  timeCell: {
    color: EstufaColors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
  },
  exportBtn: {
    backgroundColor: EstufaColors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportText: {
    color: '#052e16',
    fontSize: 15,
    fontWeight: '700',
  },
});
