import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { EstufaColors } from '@/constants/theme';
import { EstufaProvider } from '@/context/estufa-context';

SplashScreen.preventAutoHideAsync();

const EstufaNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: EstufaColors.background,
    card: EstufaColors.surface,
    text: EstufaColors.text,
    border: EstufaColors.border,
    primary: EstufaColors.primary,
  },
};

export default function RootLayout() {
  return (
    <EstufaProvider>
      <ThemeProvider value={EstufaNavTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: EstufaColors.background },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="controles" />
          <Stack.Screen
            name="offline"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
        </Stack>
      </ThemeProvider>
    </EstufaProvider>
  );
}
