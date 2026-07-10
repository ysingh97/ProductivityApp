# Branchwork mobile — production release runbook

This is the step-by-step for taking the Expo/React Native app (`mobile/`) from dev
to the Google Play and Apple App Stores using **EAS** (Expo Application Services).

App identity (already set in `mobile/app.json`):
- name: **Branchwork**, slug: `branchwork`, version: `1.0.0`
- iOS bundle id / Android package: `com.branchwork.app`

---

## 0. Prerequisites & accounts (you do these)
- [ ] **Expo account** (free) — https://expo.dev/signup
- [ ] **Google Play Developer account** — $25 one-time, identity verification (in progress)
- [ ] **Apple Developer Program** — $99/yr (only when you want iOS on the App Store)
- [ ] A production backend on **HTTPS** (the repo already deploys the API via Render;
      note its public URL, e.g. `https://branchwork-api.onrender.com`).

---

## 1. Create the Expo account & install the CLI
1. Sign up at https://expo.dev/signup (remember the account/org name).
2. From `mobile/`:
   ```bash
   npm install --global eas-cli   # or: npx eas-cli@latest <cmd>
   eas login                      # enter your Expo credentials
   eas whoami                     # confirm you're logged in
   ```
3. Link the project (creates an EAS project id and writes it into app config):
   ```bash
   cd mobile
   eas init                       # choose/create the "branchwork" project
   ```
   This assigns an `extra.eas.projectId` — commit that change.

## 2. Build config (`mobile/eas.json`)
`eas.json` is already scaffolded with three profiles:
- **development** — dev client APK / iOS simulator build, dev sign-in enabled.
- **preview** — internal-distribution APK against staging.
- **production** — Android **app-bundle (.aab)** + iOS, auto-incrementing build numbers.

Before your first real build, replace the `REPLACE_WITH_*` placeholders in `eas.json`:
- `EXPO_PUBLIC_API_URL` → your HTTPS backend (must be HTTPS; release Android blocks cleartext).
- The `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values → your web + prod Android/iOS OAuth client ids (see §4).

`appVersionSource: remote` means EAS tracks `versionCode`/`buildNumber` for you; bump
the human-facing `version` in `app.json` per release (e.g. `1.0.0` → `1.1.0`).

## 3. Android signing (fixes the "debug SHA-1" problem)
The dev OAuth client is bound to this VM's **debug** keystore
(`1F:90:75:...:60:55`) — insecure, machine-bound, **not for release**. Let EAS
generate and store a real upload keystore instead:
```bash
cd mobile
eas credentials            # Android → set up a new keystore (EAS-managed)
```
- EAS keeps the keystore server-side, so it's no longer tied to any one machine.
- Use **Google Play App Signing** (default). After your first upload, the Play Console
  → *Release → Setup → App integrity* shows **two** certificate SHA-1s:
  the **app signing** cert and the **upload** cert.
- **Register BOTH SHA-1s** on your production Android OAuth client (§4).

## 4. Production Google OAuth clients + consent screen
The current clients are **dev/staging**. Create separate **production** clients in the
same Google Cloud project (APIs & Services → Credentials → Create OAuth client ID):
- **Android** (prod): package `com.branchwork.app` + the Play **app-signing** and
  **upload** SHA-1s from §3. Enable *Advanced settings → Enable Custom URI scheme*.
- **iOS** (prod): bundle `com.branchwork.app`.
- Keep the existing **web** client id (used as `webClientId` + primary backend audience).

Then:
- Add the prod Android + iOS client ids to the backend's `GOOGLE_ALLOWED_AUDIENCES`
  (comma-separated allow-list; the backend already supports multiple audiences).
- Move the **OAuth consent screen** from *Testing* → *In production* and complete
  verification. With only `openid`/`email`/`profile` scopes this is lightweight; in
  *Testing* mode only added test users can sign in.

## 5. First internal build + install test
```bash
cd mobile
eas build --platform android --profile preview     # internal APK, quick to sideload
```
Download the APK from the build page and test real Google sign-in on a device/emulator
against the **staging** backend before touching production.

## 6. Production build + submit to Google Play
1. Create the app in the Play Console (name, default language) and fill required listing
   items: short/full description, screenshots, feature graphic, icon, **content rating**,
   **Data safety** form, target audience, and a hosted **Privacy Policy URL**.
2. Create a **Google Cloud service account** with Play Console access and download its
   JSON key to `mobile/credentials/play-service-account.json` (git-ignored — never commit),
   or run `eas submit` interactively.
3. Build + submit:
   ```bash
   cd mobile
   eas build --platform android --profile production      # produces .aab
   eas submit --platform android --profile production     # uploads to the "internal" track
   ```
4. Promote **internal → closed → open → production** in the Play Console when ready.

## 7. iOS (when you have the Apple account) — no Mac required
EAS builds iOS in the cloud:
```bash
cd mobile
eas build --platform ios --profile production
eas submit --platform ios --profile production
```
Fill `submit.production.ios` in `eas.json` (`appleId`, `ascAppId`, `appleTeamId`) and
create the App Store Connect app record (screenshots, privacy nutrition labels, review).

## 8. Pre-submission checklist
- [ ] `EXPO_PUBLIC_ALLOW_DEV_SIGN_IN` is **NOT** set in preview/production profiles
      (dev sign-in must never ship — it uses the backend test-auth personas).
- [ ] `EXPO_PUBLIC_API_URL` points at the HTTPS production backend.
- [ ] Prod OAuth client ids wired in `eas.json` and added to `GOOGLE_ALLOWED_AUDIENCES`.
- [ ] Play app-signing + upload SHA-1s registered on the prod Android OAuth client.
- [ ] Consent screen published (out of *Testing*).
- [ ] `version` bumped; icons/splash finalized; privacy policy URL live.

## Notes / gotchas (carried over from dev setup)
- expo-auth-session's Google redirect is `${applicationId}:/oauthredirect`
  (`com.branchwork.app:/oauthredirect`); `app.json` registers that scheme already.
- Android release builds block cleartext HTTP — production API **must** be HTTPS.
- Never commit keystores, service-account JSON, or `.env` files.
