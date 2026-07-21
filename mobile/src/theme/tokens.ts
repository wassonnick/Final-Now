import { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  paper: '#F7F1E8',
  paperElevated: '#FFFDF8',
  paperMuted: '#EFE6D8',
  pine: '#103F36',
  pineSoft: '#DDEBE5',
  clay: '#C9773D',
  claySoft: '#F2DCC8',
  ink: '#17231F',
  muted: '#65716C',
  line: '#E2D7C8',
  success: '#2F8A5B',
  warning: '#A86516',
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
