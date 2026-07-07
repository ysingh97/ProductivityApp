# ProductivityApp — Mobile App Plan (iOS + Android via React Native)

This plan describes how to build native iOS and Android apps for ProductivityApp
while reusing the existing backend and as much frontend logic as practical.

---

## 1. What we have today

**Web frontend** (`/src`)
- Create React App (`react-scripts` 5), React 19
- UI: **MUI 7** (`@mui/material`, `@mui/icons-material`, `@mui/x-charts`, `@mui/x-date-pickers`)
- Routing: `react-router-dom` 6
- HTTP: `axios` via `src/api/client.js` (adds `Bearer <token>` from `localStorage`)
- Auth: **Google Identity Services** (web) → posts `credential` to `/auth/google`
- State: React context (`AuthContext`), `localStorage` for token/user + theme
- Charts + date pickers from MUI X

**Backend** (`/app-server`) — reused as-is by mobile
- Express + Mongoose (MongoDB Atlas), deployed on Render (frontend/backend/worker)
- Auth: client sends the **Google ID token** as the bearer token; server verifies it
  with `google-auth-library` against `GOOGLE_CLIENT_ID` (`middleware/auth.js`)
- REST API (all under `REACT_APP_API_URL`, e.g. `/api`):
  - `POST /auth/google`
  - `GET/POST/PUT/DELETE /goals`
  - `GET/POST /lists`, `GET /lists/:goalId`
  - `GET/POST/PUT/DELETE /tasks`, task time-entries, `/tasks/list/:listId`
  - `GET /categories`
  - `GET /analytics/time-by-category`, `GET /analytics/time-series`
  - `.../integrations/google-calendar/*` (connect, status, calendars, settings, sync, disconnect)

**Feature set to reach parity with**
- Google sign-in + per-user data isolation
- Task board + task CRUD + per-task time entries
- Lists (CRUD)
- Goals (CRUD), sub-goals, goal tree view, goals overview, goal roll-ups
- Categories
- Calendar view + Google Calendar sync
- Data visualizations (time-by-category, time-series)
- Light/dark theme

**Key insight:** the backend is already a clean REST API with token auth, so the
mobile app is largely a new presentation layer over the same API. The main work is
UI (MUI → React Native), navigation (react-router → React Navigation), storage
(localStorage → AsyncStorage/SecureStore), and **mobile Google Sign-In**.

---

## 2. Recommended approach

### 2.1 Framework: **Expo (managed workflow) + React Native**
- Fastest path to shipping both iOS and Android from one codebase.
- EAS Build produces iOS/Android binaries in the cloud (no local Xcode/Mac required
  to start; a Mac/Apple Developer account is only needed for App Store submission).
- Over-the-air updates, easy dev loop (Expo Go / dev client).
- Supports config plugins for native modules (Google Sign-In works well).

*Alternative:* bare React Native CLI — more control, but more setup and native
tooling overhead. Recommend Expo unless we hit a native limitation.

### 2.2 Repo layout: monorepo with a shared package
Keep everything in this repo so the API contract stays in sync:

```
ProductivityApp/
  src/                 # existing web app (unchanged)
  app-server/          # existing backend (minor auth change, see §4)
  mobile/              # NEW: Expo React Native app
  packages/shared/     # NEW: framework-agnostic code shared by web + mobile
```

**`packages/shared`** (plain TS/JS, no React DOM, no React Native, no MUI):
- API service functions (goals/tasks/lists/categories/analytics/calendar)
- Validation logic (`taskValidation`, `goalValidation` — already platform-agnostic)
- Domain types / date + rollup helpers

The axios client is injectable so web supplies `localStorage` and mobile supplies
`AsyncStorage`/`SecureStore` for the token. This lets us port service logic once and
consume it from both apps. (Adopt npm/yarn workspaces to wire this up.)

### 2.3 Library mapping (web → mobile)
| Concern | Web (today) | Mobile |
| --- | --- | --- |
| UI kit | MUI | **React Native Paper** (Material Design, closest to MUI) |
| Navigation | react-router-dom | **React Navigation** (native stack + bottom tabs + drawer) |
| HTTP | axios | axios (works in RN, reuse via shared pkg) |
| Token/user storage | localStorage | **expo-secure-store** (token) + AsyncStorage (prefs) |
| Google sign-in | Google Identity Services | **@react-native-google-signin/google-signin** (or expo-auth-session) |
| Charts | @mui/x-charts | **victory-native** or react-native-gifted-charts |
| Date/time pickers | @mui/x-date-pickers | @react-native-community/datetimepicker / react-native-paper-dates |
| Dates | dayjs | dayjs (reuse) |
| Theme (dark/light) | MUI theme + localStorage | RN Paper theme + Appearance API |

---

## 3. Auth (the one genuinely tricky part)

The backend trusts a Google **ID token** as the bearer token and verifies its
`audience` equals `GOOGLE_CLIENT_ID`. On mobile, Google issues ID tokens with a
**different client ID** (iOS and Android OAuth clients), so:

1. Create OAuth clients in Google Cloud Console: **iOS**, **Android** (SHA-1), and a
   **Web/"server" client** used as `serverClientId`/`audience`.
2. Configure `@react-native-google-signin` with the web `serverClientId` so the
   returned `idToken` audience matches what the backend expects — OR
3. Update the backend to accept **multiple audiences** (recommended, robust):
   pass an array to `verifyIdToken({ audience: [...] })` driven by an env var
   (e.g. `GOOGLE_ALLOWED_AUDIENCES`). See §4.

Token still flows the same way: mobile obtains `idToken`, sends it to `/auth/google`,
stores it securely, and attaches `Authorization: Bearer <idToken>` on every request.

> Note on Google Calendar integration: mobile can start by opening the existing
> OAuth connect URL in an in-app browser (the flow is already server-driven), then
> polish native UX later. This keeps calendar sync out of the critical path for v1.

---

## 4. Backend changes (small, backward-compatible)
1. **Multi-audience token verification** in `app-server/middleware/auth.js`
   (`verifyGoogleToken`): accept web + iOS + Android client IDs via an env-configured
   allow-list. Fully backward compatible with the current web client.
2. Add the new client IDs to production/staging env + `.env.*.example`.
3. (Later, optional) native-friendly Google Calendar OAuth redirect handling.

No data model or route changes are required for feature parity.

---

## 5. Phased delivery

**Phase 0 — Foundations (setup)**
- Scaffold `mobile/` Expo app + `packages/shared`; set up workspaces.
- Extract API client + service functions + validation into `packages/shared`;
  refactor web to import from it (no behavior change) to prove the contract.
- Point mobile at the deployed backend URL via env config (Expo `app.config`).

**Phase 1 — Auth + shell**
- Google Sign-In on device → `/auth/google` → SecureStore.
- Backend multi-audience change (§4).
- App shell: React Navigation (auth stack vs. app tabs/drawer), Paper theme with
  light/dark, protected navigation mirroring `RequireAuth`.

**Phase 2 — Core CRUD**
- Task board + task detail/create/edit + time entries.
- Lists (overview, detail, create).
- Categories where needed by forms.

**Phase 3 — Goals**
- Goals overview, goal detail, create/edit, sub-goals, roll-ups.
- Goal tree view (native tree/expandable list).

**Phase 4 — Calendar + visualizations**
- Calendar view; Google Calendar connect (in-app browser first).
- Analytics screens with native charts (time-by-category, time-series).

**Phase 5 — Polish + release**
- Empty/loading/error states, offline handling, deep links, push (optional).
- App icons/splash, store metadata.
- EAS Build + submit to TestFlight / Play Console internal testing.

---

## 6. Testing & CI
- Unit-test shared logic once (validation, service functions) — benefits both apps.
- Component tests with `@testing-library/react-native`; Detox/Maestro for e2e (later).
- Extend GitHub Actions: typecheck/test `mobile` + `packages/shared`; EAS Build
  workflow for release channels.

---

## 7. Prerequisites / decisions needed from you
1. **Expo (recommended) vs bare React Native CLI?**
2. **UI kit:** React Native Paper (Material, matches current look) vs alternative
   (Tamagui/gluestack) if you want a fresh design.
3. **Feature scope for v1** — full parity, or a lean v1 (auth + tasks + lists + goals)
   with calendar/visualizations in a fast follow?
4. **Accounts/access:** Google Cloud project access to create iOS/Android OAuth
   clients; Apple Developer ($99/yr) + Google Play ($25 one-time) for store release;
   Expo/EAS account.
5. **Deployed backend base URL** for mobile to target (prod + staging).

---

## 8. Suggested first PR (once approach is confirmed)
- Add `mobile/` Expo app that boots to a Google sign-in screen and, on success,
  lists the user's tasks from the live API (end-to-end auth + one real screen).
- Add `packages/shared` with the API client + task service + validation, consumed by
  both web and mobile.
- Backend: multi-audience Google token verification.

This proves the whole pipeline (auth → API → render on device) with minimal surface
area before we build out every screen.
