import { TextStyle, ViewStyle } from 'react-native';

// Locked SocietyFlats brand palette (matches web + brand kit):
// Ink Navy #233B6E primary, Brass Gold #B08A3E accent, cream paper, sage lines.
export const colors = {
  paper: '#F8F3EA',
  paperElevated: '#FFFDF8',
  paperMuted: '#EFE9DC',
  pine: '#233B6E',
  pineSoft: '#DCE6F7',
  clay: '#B08A3E',
  claySoft: '#F0E6D0',
  ink: '#1C2434',
  muted: '#6A7080',
  line: '#E3DFD3',
  success: '#2F8A5B',
  warning: '#8C6E2F',
  danger: '#B8344A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  heading: {
    fontFamily: 'Georgia',
    color: colors.ink,
    fontWeight: '700',
  } satisfies TextStyle,
  body: {
    fontFamily: 'System',
    color: colors.ink,
  } satisfies TextStyle,
  muted: {
    fontFamily: 'System',
    color: colors.muted,
  } satisfies TextStyle,
};

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  } satisfies ViewStyle,
};

export const theme = { colors, spacing, radius, iconSize, typography, shadows };

export type Theme = typeof theme;
