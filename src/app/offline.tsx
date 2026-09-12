import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeafLogo } from '@/components/estufa/leaf-logo';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa } from '@/context/estufa-context';

export default function OfflineScreen() {
  const insets = useSafeAreaInsets();
  const { setOnline } = useEstufa();

  const retry = () => {
    setOnline(true);
    router.replace('/');
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <View style={styles.brand}>
        <LeafLogo size={56} />
        <Text style={styles.brandTitle}>Estufa Inteligente</Text>
        <Text style={styles.brandTagline}>Tecnologia para um futuro mais verde</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="wifi" size={28} color={EstufaColors.danger} />
          <View style={styles.slash} />
        </View>
        <Text style={styles.cardTitle}>Estufa Offline</Text>
        <Text style={styles.cardDesc}>
          Não foi possível conectar à estufa. Verifique sua internet e tente novamente.
        </Text>
        <Pressable style={styles.retryBtn} onPress={retry}>
          <Ionicons name="refresh" size={18} color="#052e16" />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Ionicons name="leaf" size={14} color={EstufaColors.primary} />
        <Text style={styles.footerText}>Cultivando um mundo melhor</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: EstufaColors.background,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.five,
  },
  brandTitle: {
    color: EstufaColors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  brandTagline: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: EstufaColors.dangerMuted,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slash: {
    position: 'absolute',
    width: 34,
    height: 2,
    backgroundColor: EstufaColors.danger,
    transform: [{ rotate: '-40deg' }],
  },
  cardTitle: {
    color: EstufaColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  cardDesc: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.one,
    width: '100%',
    backgroundColor: EstufaColors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: {
    color: '#052e16',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: EstufaColors.textMuted,
    fontSize: 12,
  },
});
