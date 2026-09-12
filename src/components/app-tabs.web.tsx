import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { Href } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { EstufaColors, MaxContentWidth, Spacing } from '@/constants/theme';

const TABS: {
  name: string;
  href: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'home', href: '/', label: 'Início', icon: 'home-outline', iconActive: 'home' },
  {
    name: 'graficos',
    href: '/graficos',
    label: 'Gráficos',
    icon: 'stats-chart-outline',
    iconActive: 'stats-chart',
  },
  {
    name: 'historico',
    href: '/historico',
    label: 'Histórico',
    icon: 'document-text-outline',
    iconActive: 'document-text',
  },
  {
    name: 'configuracoes',
    href: '/configuracoes',
    label: 'Configurações',
    icon: 'settings-outline',
    iconActive: 'settings',
  },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} iconActive={tab.iconActive}>
                {tab.label}
              </TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  iconActive,
  ...props
}: TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}) {
  const color = isFocused ? EstufaColors.primary : EstufaColors.textMuted;

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabInner, isFocused && styles.tabInnerActive]}>
        <Ionicons name={isFocused ? iconActive : icon} size={20} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{children}</Text>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    padding: Spacing.three,
    alignItems: 'center',
  },
  innerContainer: {
    backgroundColor: EstufaColors.surface,
    borderRadius: 28,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderColor: EstufaColors.border,
  },
  tabButton: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  tabInnerActive: {
    backgroundColor: EstufaColors.primaryMuted,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
