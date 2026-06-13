import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#0056D2',
    text: '#0F172A',
    background: '#F6F6F6',
    surface: '#FFFFFF',
    backgroundElement: '#EEF2F7',
    backgroundSelected: '#DCE8FF',
    textSecondary: '#475569',
    danger: '#DC2626',
    success: '#16A34A',
  },
  dark: {
    primary: '#3B82F6',
    text: '#F8FAFC',
    background: '#0B1220',
    surface: '#111827',
    backgroundElement: '#1E293B',
    backgroundSelected: '#1D4ED8',
    textSecondary: '#CBD5E1',
    danger: '#EF4444',
    success: '#22C55E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
