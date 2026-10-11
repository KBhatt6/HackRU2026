import { Platform } from 'react-native';

// Medicinal / apothecary palette: parchment-beige backgrounds, cream surfaces,
// deep herbal-green text and green accents. Status colors are darkened so they
// stay readable on the light beige surfaces.
export const colors = {
  background: '#F3ECDD',
  surface: '#FBF7EE',
  surfaceMuted: '#E8DFCC',
  primary: '#2F6B4F',
  primaryDark: '#1F4D38',
  primarySoft: '#DCE8DF',
  accent: '#2F6B4F',
  accentSoft: '#DCE8DF',
  ink: '#1E3B2F',
  inkMuted: '#5B6B5F',
  border: '#D6CCB8',
  available: '#2E7D4F',
  availableSoft: '#DDEEDF',
  low: '#8A5A00',
  lowSoft: '#F6E7C4',
  danger: '#A8322D',
  dangerSoft: '#F5DEDA',
  unknown: '#5B6B5F',
  unknownSoft: '#E8E2D4',
  stale: '#7A6000',
  staleSoft: '#F3E8BF',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const fonts = {
  body: 'System',
  // Built-in serif faces (no font download): Georgia on iOS/web, Noto Serif on Android.
  heading: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
};
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
