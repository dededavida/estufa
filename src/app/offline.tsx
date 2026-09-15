import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeafLogo } from '@/components/estufa/leaf-logo';
import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa, type AvailableDevice } from '@/context/estufa-context';

type Step = 1 | 2 | 3;

export default function OfflineScreen() {
  const insets = useSafeAreaInsets();
  const {
    availableDevices,
    refreshDevices,
    selectDevice,
    retryConnection,
    scanning,
    pairing,
    btSupported,
    error,
    connectingMessage,
    lastBtAddress,
    isOnline,
  } = useEstufa();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const autoConnectTried = useRef(false);

  useEffect(() => {
    if (isOnline) {
      router.replace('/');
    }
  }, [isOnline]);

  const scan = useCallback(async () => {
    autoConnectTried.current = false;
    setStep(2);
    const devices = await refreshDevices();
    setStep(devices.length > 0 ? 3 : 2);
    return devices;
  }, [refreshDevices]);

  useEffect(() => {
    if (!btSupported) return;
    void scan();
  }, [btSupported, scan]);

  const connect = useCallback(
    async (device: AvailableDevice) => {
      setSelectedId(device.deviceId);
      setStep(3);
      const ok = await selectDevice(device.deviceId);
      if (ok) router.replace('/');
    },
    [selectDevice]
  );

  // Se só achar uma estufa (ou a última usada), conecta sozinho.
  useEffect(() => {
    if (pairing || scanning || isOnline || autoConnectTried.current) return;
    if (availableDevices.length === 0) return;

    const preferred =
      availableDevices.find((d) => d.deviceId === lastBtAddress) ??
      (availableDevices.length === 1 ? availableDevices[0] : null);

    if (!preferred) return;
    autoConnectTried.current = true;
    void connect(preferred);
  }, [
    availableDevices,
    connect,
    isOnline,
    lastBtAddress,
    pairing,
    scanning,
  ]);

  const reconnectLast = async () => {
    if (!lastBtAddress) {
      await scan();
      return;
    }
    setSelectedId(lastBtAddress);
    setStep(3);
    const ok = await retryConnection();
    if (ok) router.replace('/');
  };

  const busy = pairing || scanning;
  // Single status line — buttons/empty state must not repeat conflicting verbs.
  const statusText =
    connectingMessage ??
    (pairing
      ? 'Conectando…'
      : scanning
        ? 'Buscando estufa…'
        : availableDevices.length > 0
          ? 'Toque na estufa para conectar'
          : 'Toque em Buscar estufa');

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three },
      ]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <LeafLogo size={48} />
          <Text style={styles.brandTitle}>Conectar estufa</Text>
          <Text style={styles.brandTagline}>{statusText}</Text>
        </View>

        <View style={styles.steps}>
          <StepRow
            number={1}
            active={step === 1}
            done={step > 1}
            title="ESP32 ligado"
            subtitle="A placa precisa estar alimentada"
          />
          <StepRow
            number={2}
            active={step === 2}
            done={step > 2 || availableDevices.length > 0}
            title="Pareada no celular"
            subtitle="Nas configs do Android: Bluetooth → EstufaESP32"
          />
          <StepRow
            number={3}
            active={step === 3 || pairing}
            done={isOnline}
            title="Conectar no app"
            subtitle="Buscamos e conectamos por você"
          />
        </View>

        {!btSupported ? (
          <View style={styles.emptyCard}>
            <Ionicons name="phone-portrait-outline" size={22} color={EstufaColors.textMuted} />
            <Text style={styles.emptyText}>
              Abra o app instalado no Android (não o Expo Go) para usar o Bluetooth da estufa.
            </Text>
          </View>
        ) : (
          <>
            {busy ? (
              <Pressable style={[styles.primaryBtn, styles.disabled]} disabled>
                <ActivityIndicator color="#052e16" />
                <Text style={styles.primaryBtnText}>
                  {pairing ? 'Conectando…' : 'Buscando…'}
                </Text>
              </Pressable>
            ) : (
              <>
                {lastBtAddress && !isOnline ? (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => void reconnectLast()}>
                    <Ionicons name="refresh" size={18} color="#052e16" />
                    <Text style={styles.primaryBtnText}>Reconectar última estufa</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={lastBtAddress ? styles.secondaryBtn : styles.primaryBtn}
                  onPress={() => void scan()}>
                  <Ionicons
                    name="search"
                    size={18}
                    color={lastBtAddress ? EstufaColors.primary : '#052e16'}
                  />
                  <Text
                    style={lastBtAddress ? styles.secondaryBtnText : styles.primaryBtnText}>
                    Buscar estufa
                  </Text>
                </Pressable>
              </>
            )}

            {availableDevices.length === 0 && !busy && step >= 2 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bluetooth-outline" size={22} color={EstufaColors.textMuted} />
                <Text style={styles.emptyText}>
                  Nenhuma estufa encontrada. Pareie EstufaESP32 no Bluetooth do sistema e toque em
                  Buscar estufa.
                </Text>
              </View>
            ) : availableDevices.length > 0 ? (
              <View style={styles.list}>
                <Text style={styles.listTitle}>Estufas encontradas</Text>
                {availableDevices.map((device) => {
                  const isSelected = pairing && selectedId === device.deviceId;
                  const isLast = device.deviceId === lastBtAddress;
                  return (
                    <Pressable
                      key={device.deviceId}
                      style={[styles.deviceRow, isSelected && styles.deviceRowActive]}
                      disabled={busy}
                      onPress={() => void connect(device)}>
                      <View style={styles.deviceIcon}>
                        <Ionicons name="leaf" size={20} color={EstufaColors.primary} />
                      </View>
                      <View style={styles.deviceBody}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceMeta}>
                          {isLast ? 'Última usada · ' : ''}
                          {device.deviceId}
                        </Text>
                      </View>
                      {isSelected ? (
                        <ActivityIndicator color={EstufaColors.primary} />
                      ) : (
                        <View style={styles.connectChip}>
                          <Text style={styles.connectChipText}>Conectar</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={EstufaColors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StepRow({
  number,
  title,
  subtitle,
  active,
  done,
}: {
  number: number;
  title: string;
  subtitle: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepBadge,
          done && styles.stepBadgeDone,
          active && !done && styles.stepBadgeActive,
        ]}>
        {done ? (
          <Ionicons name="checkmark" size={14} color="#052e16" />
        ) : (
          <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{number}</Text>
        )}
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepTitle, (active || done) && styles.stepTitleActive]}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: EstufaColors.background, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.four },
  brand: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  brandTitle: { color: EstufaColors.text, fontSize: 24, fontWeight: '700' },
  brandTagline: { color: EstufaColors.textSecondary, fontSize: 14, textAlign: 'center' },
  steps: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  stepRow: { flexDirection: 'row', gap: Spacing.two + 2, alignItems: 'flex-start' },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: EstufaColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  stepBadgeActive: {
    borderColor: EstufaColors.primary,
    backgroundColor: EstufaColors.primaryMuted,
  },
  stepBadgeDone: {
    backgroundColor: EstufaColors.primary,
    borderColor: EstufaColors.primary,
  },
  stepNumber: { color: EstufaColors.textMuted, fontSize: 13, fontWeight: '700' },
  stepNumberActive: { color: EstufaColors.primary },
  stepBody: { flex: 1, gap: 2 },
  stepTitle: { color: EstufaColors.textSecondary, fontSize: 14, fontWeight: '600' },
  stepTitleActive: { color: EstufaColors.text },
  stepSubtitle: { color: EstufaColors.textMuted, fontSize: 12, lineHeight: 17 },
  primaryBtn: {
    width: '100%',
    backgroundColor: EstufaColors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#052e16', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    width: '100%',
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  secondaryBtnText: { color: EstufaColors.primary, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.7 },
  list: { gap: Spacing.two },
  listTitle: {
    color: EstufaColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  deviceRowActive: { borderColor: EstufaColors.primary },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EstufaColors.primaryMuted,
  },
  deviceBody: { flex: 1, gap: 2 },
  deviceName: { color: EstufaColors.text, fontSize: 15, fontWeight: '700' },
  deviceMeta: { color: EstufaColors.textMuted, fontSize: 12 },
  connectChip: {
    backgroundColor: EstufaColors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectChipText: { color: '#052e16', fontSize: 12, fontWeight: '700' },
  emptyCard: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: {
    color: EstufaColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: EstufaColors.dangerMuted,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  errorText: { color: EstufaColors.danger, fontSize: 13, flex: 1, lineHeight: 18 },
});
