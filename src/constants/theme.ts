/**
 * Theme tokens for Estufa Inteligente — dark greenhouse UI.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const EstufaColors = {
  background: '#0B0D0C',
  surface: '#181A19',
  surfaceElevated: '#1F2221',
  border: '#2A2E2C',
  primary: '#4ADE80',
  primaryMuted: 'rgba(74, 222, 128, 0.15)',
  primaryGlow: 'rgba(74, 222, 128, 0.35)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.18)',
  temp: '#F87171',
  humidity: '#60A5FA',
  soil: '#4ADE80',
  light: '#FBBF24',
  online: '#4ADE80',
  offline: '#EF4444',
  switchTrackOff: '#3F3F46',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: EstufaColors.text,
    background: EstufaColors.background,
    backgroundElement: EstufaColors.surface,
    backgroundSelected: EstufaColors.surfaceElevated,
    textSecondary: EstufaColors.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
