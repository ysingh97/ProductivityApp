# Productivity Hub — Mobile (Expo / React Native)

Native iOS + Android client for ProductivityApp. It reuses the existing backend
REST API and the framework-agnostic `@productivity/shared` package (API client,
service functions, validation).

## Requirements
- Node.js >= 20.19.4 (Expo SDK 57)
- The ProductivityApp backend running and reachable from the device/emulator
- Xcode (iOS) / Android Studio + emulator, or the Expo Go app on a physical device

## Setup
```bash
cd mobile
npm install
cp .env.example .env   # then fill in the values
```

### Environment (`mobile/.env`)
Expo inlines `EXPO_PUBLIC_*` variables at build time.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend API base URL incl. `/api`. Android emulator uses `http://10.0.2.2:5000/api` to reach the host. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth **web** client id (used as the token audience the backend verifies). |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client id. |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client id. |
| `EXPO_PUBLIC_ALLOW_DEV_SIGN_IN` | `true` to show a developer sign-in that uses the backend test-auth personas. Non-production only. |
| `EXPO_PUBLIC_DEV_AUTH_TOKEN` | Test persona token for developer sign-in (default `test:basic`). |

The backend must include the mobile client IDs in `GOOGLE_ALLOWED_AUDIENCES` so
it accepts ID tokens issued to the iOS/Android OAuth clients. For developer
sign-in, run the backend with `ALLOW_TEST_AUTH=true` (and `NODE_ENV != production`).

## Run
```bash
npm run android   # Android emulator / device
npm run ios       # iOS simulator (macOS)
npm start         # Expo dev server (choose a target)
```

> Native Google Sign-In / secure store require a development build (EAS Build) or
> Expo Go depending on the module. Developer sign-in works without Google OAuth.

## Structure
```
mobile/
  App.js                     # providers (Paper theme, auth) + navigation root
  metro.config.js            # monorepo config to resolve @productivity/shared
  src/
    api/                     # api client (SecureStore token) + services
    auth/                    # AuthContext (SecureStore-backed)
    config/env.js            # EXPO_PUBLIC_* config
    navigation/              # stack + bottom tabs
    screens/                 # SignIn, Board, Lists, Goals, Settings, ...
    components/              # shared UI bits
    theme.js                 # Paper light/dark themes matching the web palette
```

## Notes
- `@productivity/shared` is consumed via a `file:` dependency and resolved by Metro
  (`metro.config.js`). Axios is aliased to its browser build for React Native.
- Calendar and Visualizations screens are placeholders pending follow-up work.
