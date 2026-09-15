import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstufaColors, Radius, Spacing } from '@/constants/theme';
import { useEstufa } from '@/context/estufa-context';

export default function ConfiguracoesScreen() {
  const insets = useSafeAreaInsets();
  const {
    greenhouseName,
    deviceId,
    isOnline,
    lastUpdate,
    btSupported,
    error,
    disconnect,
    sensors,
    refreshSensors,
    refreshing,
  } = useEstufa();

  const copyDeviceId = () => {
    Alert.alert('ID do dispositivo', deviceId);
  };

  const forceSensorRefresh = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Conecte a estufa para pedir STATUS.');
      return;
    }
    void refreshSensors()
      .then(() => Alert.alert('Sensores', 'Pedido STATUS enviado.'))
      .catch((err) =>
        Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao atualizar')
      );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Ajustes do aplicativo e da estufa</Text>
        </View>

        <Section title="Estufa">
          <SettingsRow label="Nome da Estufa" value={greenhouseName} />
          <SettingsRow
            label="ID do Dispositivo"
            value={deviceId}
            trailing={
              <Pressable onPress={copyDeviceId} hitSlop={8}>
                <Ionicons name="copy-outline" size={18} color={EstufaColors.textMuted} />
              </Pressable>
            }
          />
          <SettingsRow
            label="Status da Conexão"
            value={isOnline ? 'Conectada' : 'Desconectada'}
            valueColor={isOnline ? EstufaColors.online : EstufaColors.offline}
            onPress={() => {
              router.push('/offline');
            }}
          />
          <SettingsRow label="Última Atualização" value={lastUpdate} last />
        </Section>

        <Section title="Sensores (ao vivo)">
          <SettingsRow
            label="Umidade do Solo"
            value={
              sensors.umidadeSolo == null ? '—' : `${sensors.umidadeSolo}%`
            }
          />
          <SettingsRow
            label="Luminosidade"
            value={
              sensors.luminosidade == null
                ? 'Indisponível (sem LDR)'
                : `${sensors.luminosidade}%`
            }
          />
          <SettingsRow
            label="Atualizar sensores"
            value={refreshing ? 'Pedindo…' : 'Enviar STATUS'}
            onPress={forceSensorRefresh}
            last
          />
        </Section>

        <Section title="Conexão">
          <SettingsRow
            label="Bluetooth"
            value={btSupported ? 'Pronto' : 'Indisponível'}
            valueColor={btSupported ? EstufaColors.online : EstufaColors.light}
          />
          <SettingsRow
            label={isOnline ? 'Trocar estufa' : 'Conectar estufa'}
            value="Abrir tela de conexão"
            onPress={() => router.push('/offline')}
          />
          <SettingsRow
            label="Desconectar"
            value={isOnline ? 'Toque para sair' : '—'}
            onPress={() => {
              if (!isOnline) return;
              void disconnect().then(() => router.replace('/offline'));
            }}
            last
          />
        </Section>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Section title="Aparência">
          <SettingsRow
            label="Tema"
            value="Escuro"
            trailing={<Ionicons name="moon-outline" size={18} color={EstufaColors.textMuted} />}
            last
          />
        </Section>

        <Section title="Sobre">
          <SettingsRow label="Versão do App" value="1.0.0" />
          <SettingsRow label="Desenvolvido por" value="Estufa Inteligente" last />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  valueColor,
  trailing,
  last,
  onPress,
}: {
  label: string;
  value: string;
  valueColor?: string;
  trailing?: ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        {trailing}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
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
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: EstufaColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: EstufaColors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    gap: Spacing.two,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: EstufaColors.border,
  },
  rowLabel: {
    color: EstufaColors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowValue: {
    color: EstufaColors.textSecondary,
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: 220,
  },
  errorBox: {
    backgroundColor: EstufaColors.dangerMuted,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  errorText: {
    color: EstufaColors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
