# Branchwork — Mobile (Expo / React Native)

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

## Tests
- **Unit / component** (`npm test`): Jest + React Native Testing Library. Runs in the
  `Mobile Tests` CI job on every PR.
- **End-to-end** (`npm run test:e2e`): [Maestro](https://maestro.mobile.dev) flows in
  `e2e/flows/` driving a real emulator against the live backend. Prereqs: a booted
  Android emulator/device with the app installed and the backend reachable at
  `EXPO_PUBLIC_API_URL`. Install Maestro with `curl -Ls https://get.maestro.mobile.dev | bash`.

  Quickest install for a run is a dev build (`npm run android`, keeps Metro up).
  To mirror CI (self-contained release APK, no Metro):
  ```
  npx expo prebuild --platform android --no-install
  # release builds block cleartext HTTP; the emulator backend is http://10.0.2.2 —
  # enable it for this test-only APK (production is built via EAS, unaffected):
  sed -i 's/<application android:name=".MainApplication"/&  android:usesCleartextTraffic="true"/' \
    android/app/src/main/AndroidManifest.xml
  (cd android && ./gradlew :app:assembleRelease)
  adb install -r android/app/build/outputs/apk/release/app-release.apk
  npm run test:e2e
  ```

  Flows:
  - `smoke.yaml` — developer sign-in, then assert each primary tab (Board/Lists/Goals/Calendar) renders.
  - `task-crud.yaml` — create a task via the form (round-trips to the backend), see it on the Board, open and delete it.
  - `lists.yaml` — create a list, see it on the Lists tab, open its detail (no delete endpoint, so no cleanup).
  - `goals.yaml` — create a goal, see it on the Goals tab, open and delete it.
  - `calendar.yaml` — exercise Calendar range nav (Prev/Today/Next), the Week/Month switch, and the Tasks toggle.
  - `visualizations.yaml` — open the Analytics tab and assert the stat cards + period controls render across Week/Year.

  In CI the `Mobile E2E` workflow (`.github/workflows/mobile-e2e.yml`) builds a
  debug-signed release APK, boots an Android 34 emulator, starts Mongo + backend,
  and runs the flows. It only triggers on `mobile/**` / `packages/shared/**` changes
  (and `workflow_dispatch`) because booting an emulator + building the app is slow.

## Structure
```
mobile/
  App.js                     # providers (Paper theme, auth) + navigation root
  metro.config.js            # monorepo config to resolve @productivity/shared
  e2e/                       # Maestro end-to-end flows
  src/
    api/                     # api client (SecureStore token) + services
    auth/                    # AuthContext (SecureStore-backed)
    config/env.js            # EXPO_PUBLIC_* config
    navigation/              # stack + bottom tabs
    screens/                 # SignIn, Board, Lists, Goals, Calendar, Settings, ...
    components/              # shared UI bits
    theme.js                 # Paper light/dark themes matching the web palette
```

## Notes
- `@productivity/shared` is consumed via a `file:` dependency and resolved by Metro
  (`metro.config.js`). Axios is aliased to its browser build for React Native.
- The Analytics screen renders time-by-category (donut) and trend (bar) charts
  with `react-native-svg`, driven by the shared `visualizationsModel` helpers and
  the `/analytics/*` endpoints. Week/Month/Year period nav mirrors the web app.
