import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

import { EquipmentQuickCard, SensorCard } from '@/components/estufa/cards';
import { LeafLogo } from '@/components/estufa/leaf-logo';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa, type EquipmentId } from '@/context/estufa-context';
import { EQUIPMENT_META, SENSOR_META, CURRENT_SENSORS, type SensorKey } from '@/data/mock';

const GREENHOUSE_IMAGE =
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80';

const SENSOR_KEYS = Object.keys(SENSOR_META) as SensorKey[];
const EQUIPMENT_IDS = Object.keys(EQUIPMENT_META) as EquipmentId[];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    equipment,
    setEquipment,
    isOnline,
    lastUpdate,
    sensors,
    loading,
    refreshing,
    refresh,
    btSupported,
    error,
    connectingMessage,
  } = useEstufa();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!loading && !isOnline) {
      router.replace('/offline');
    }
  }, [loading, isOnline]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={EstufaColors.primary} size="large" />
        <Text style={styles.loadingText}>
          {connectingMessage ?? 'Preparando conexão…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={EstufaColors.primary}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LeafLogo size={26} />
            <View>
              <Text style={styles.title}>Minha Estufa</Text>
            </View>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/configuracoes')}
            hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={EstufaColors.textSecondary} />
          </Pressable>
        </View>

        {!btSupported || error ? (
          <Pressable
            style={styles.banner}
            onPress={() => router.push('/offline')}>
            <Ionicons name="bluetooth-outline" size={18} color={EstufaColors.light} />
            <Text style={styles.bannerText}>
              {error ?? 'Toque para conectar a estufa'}
            </Text>
            <Text style={styles.bannerAction}>Conectar</Text>
          </Pressable>
        ) : null}

        <View style={styles.heroCard}>
          <Image source={{ uri: GREENHOUSE_IMAGE }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.onlineBadge}>
            <View style={[styles.onlineDot, !isOnline && styles.offlineDot]} />
            <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <Text style={styles.lastUpdate}>Última atualização: {lastUpdate}</Text>
        </View>

        <View style={styles.sensorGrid}>
          {SENSOR_KEYS.map((key) => (
            <SensorCard
              key={key}
              sensorKey={key}
              value={sensors[key]}
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
          {EQUIPMENT_IDS.map((id) => (
            <EquipmentQuickCard
              key={id}
              id={id}
              on={equipment[id]}
              onToggle={(value) => {
                void setEquipment(id, value);
              }}
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: EstufaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  bannerText: {
    flex: 1,
    color: EstufaColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bannerAction: {
    color: EstufaColors.primary,
    fontSize: 13,
    fontWeight: '700',
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
  offlineDot: {
    backgroundColor: EstufaColors.offline,
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
