import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Mirrors the web app's MUI palette so the mobile app feels consistent.
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#c24b2f',
    onPrimary: '#ffffff',
    secondary: '#4c6a5f',
    onSecondary: '#ffffff',
    background: '#f6efe6',
    onBackground: '#1f2933',
    surface: '#fbf7f0',
    surfaceVariant: '#efe4d5',
    onSurface: '#1f2933',
    onSurfaceVariant: '#5a6668',
    outline: '#e1d4c2',
    error: '#b3261e'
  }
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#d07a58',
    onPrimary: '#1f1712',
    secondary: '#7aa193',
    onSecondary: '#10201b',
    background: '#141310',
    onBackground: '#f5efe6',
    surface: '#1d1b17',
    surfaceVariant: '#2a2620',
    onSurface: '#f5efe6',
    onSurfaceVariant: '#c7bfb4',
    outline: 'rgba(245, 239, 230, 0.16)',
    error: '#f2b8b5'
  }
};
