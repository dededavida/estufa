import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { EquipmentQuickCard, SensorCard } from '@/components/estufa/cards';
import { LeafLogo } from '@/components/estufa/leaf-logo';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa } from '@/context/estufa-context';
import { CURRENT_SENSORS, EQUIPMENT_META } from '@/data/mock';

const GREENHOUSE_IMAGE =
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { equipment, setEquipment, isOnline, lastUpdate } = useEstufa();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!isOnline) {
      router.replace('/offline');
    }
  }, [isOnline]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LeafLogo size={26} />
            <View>
              <Text style={styles.title}>Minha Estufa</Text>
              <Text style={styles.subtitle}>Estufa Inteligente</Text>
            </View>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/configuracoes')}
            hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={EstufaColors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Image source={{ uri: GREENHOUSE_IMAGE }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          <Text style={styles.lastUpdate}>Última atualização: {lastUpdate}</Text>
        </View>

        <View style={styles.sensorGrid}>
          {(Object.keys(CURRENT_SENSORS) as (keyof typeof CURRENT_SENSORS)[]).map((key) => (
            <SensorCard
              key={key}
              sensorKey={key}
              value={CURRENT_SENSORS[key].value}
              sparkline={CURRENT_SENSORS[key].sparkline}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Equipamentos</Text>
          <Pressable onPress={() => router.push('/controles')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </Pressable>
        </View>

        <View style={styles.equipRow}>
          {(Object.keys(EQUIPMENT_META) as (keyof typeof EQUIPMENT_META)[]).map((id) => (
            <EquipmentQuickCard
              key={id}
              id={id}
              on={equipment[id]}
              onToggle={(value) => setEquipment(id, value)}
              onPress={() => router.push('/controles')}
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
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    color: EstufaColors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: EstufaColors.textSecondary,
    fontSize: 13,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: EstufaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: EstufaColors.surface,
  },
  heroImage: {
    width: '100%',
    height: 160,
  },
  onlineBadge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: EstufaColors.online,
  },
  onlineText: {
    color: EstufaColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdate: {
    color: EstufaColors.textSecondary,
    fontSize: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  sectionTitle: {
    color: EstufaColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    color: EstufaColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  equipRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
});
