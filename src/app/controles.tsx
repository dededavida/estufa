import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EquipmentRow } from '@/components/estufa/cards';
import { EstufaColors, Spacing } from '@/constants/theme';
import { useEstufa } from '@/context/estufa-context';
import { EQUIPMENT_META } from '@/data/mock';

export default function ControlesScreen() {
  const insets = useSafeAreaInsets();
  const { equipment, setEquipment } = useEstufa();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={EstufaColors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Controles</Text>
            <Text style={styles.subtitle}>Gerencie os equipamentos da sua estufa</Text>
          </View>
        </View>

        <View style={styles.list}>
          {(Object.keys(EQUIPMENT_META) as (keyof typeof EQUIPMENT_META)[]).map((id) => (
            <EquipmentRow
              key={id}
              id={id}
              on={equipment[id]}
              onToggle={(value) => {
                void setEquipment(id, value);
              }}
            />
          ))}
        </View>
      </ScrollView>
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
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: EstufaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerText: {
    flex: 1,
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
  list: {
    gap: Spacing.two + 2,
  },
});
