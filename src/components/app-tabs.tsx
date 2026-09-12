import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { EstufaColors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={EstufaColors.background}
      indicatorColor={EstufaColors.primaryMuted}
      tintColor={EstufaColors.primary}
      labelStyle={{
        default: { color: EstufaColors.textMuted },
        selected: { color: EstufaColors.primary },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="graficos">
        <NativeTabs.Trigger.Label>Gráficos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.xyaxis.line', selected: 'chart.xyaxis.line' }}
          md="show_chart"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="historico">
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'doc.text', selected: 'doc.text.fill' }}
          md="description"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="configuracoes">
        <NativeTabs.Trigger.Label>Configurações</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
