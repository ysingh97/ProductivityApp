import { Platform } from 'react-native';

// Expo inlines EXPO_PUBLIC_* variables at build time, so these can be read
// directly from process.env in app code. Configure them via mobile/.env
// (see mobile/.env.example).
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

// Google sign-in via expo-auth-session needs the client id for the *current*
// platform (web/localhost uses the web client id, native uses ios/android).
// Used to gate mounting the Google auth hook so it doesn't throw when unset.
export const GOOGLE_SIGN_IN_CONFIGURED = Boolean(
  Platform.select({
    ios: GOOGLE_IOS_CLIENT_ID,
    android: GOOGLE_ANDROID_CLIENT_ID,
    default: GOOGLE_WEB_CLIENT_ID
  })
);

// Enables a non-production "developer sign-in" that authenticates with the
// backend's test-auth personas (requires ALLOW_TEST_AUTH on the backend). Never
// enable this against production.
export const ALLOW_DEV_SIGN_IN = process.env.EXPO_PUBLIC_ALLOW_DEV_SIGN_IN === 'true';
export const DEV_AUTH_TOKEN = process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN || 'test:basic';
