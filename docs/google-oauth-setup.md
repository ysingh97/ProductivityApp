# Creating Google OAuth clients for Branchwork (iOS + Android)

You already have a **Web** client
(`517595583345-vjecsnd5grnvoafsm5n0hjpid8v1m0im.apps.googleusercontent.com`).
You now need one **iOS** client and one **Android** client, in the **same Google
Cloud project** as the web client.

App identifiers (already set in `mobile/app.json`):
- iOS bundle ID: `com.branchwork.app`
- Android package: `com.branchwork.app`

---

## 0. Prerequisites (one-time, per project)

1. Go to https://console.cloud.google.com/ and select the **same project** that
   owns your existing web client (top-left project picker).
2. **APIs & Services → OAuth consent screen**: make sure it's configured
   (User type = External is fine). If you're still in "Testing", add your Google
   account under **Test users** so you can sign in.

---

## 1. iOS OAuth client

1. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
2. **Application type: iOS**.
3. **Name**: `Branchwork iOS` (anything).
4. **Bundle ID**: `com.branchwork.app`.
5. (Leave App Store ID / Team ID blank for now — not required to test.)
6. Click **Create**. Copy the **Client ID** (looks like
   `xxxx-yyyy.apps.googleusercontent.com`). Send it to me.

iOS has **no SHA-1**. The client ID also implies a "reversed client ID" URL
scheme (`com.googleusercontent.apps.xxxx-yyyy`) — I'll add that to `app.json`
automatically; you don't have to do anything with it.

---

## 2. Android OAuth client

An Android OAuth client is bound to **(package name + signing SHA-1
fingerprint)**. Real Google sign-in on Android only works from an app build
signed with a key whose SHA-1 you registered here. Pick ONE of the two options
below for the SHA-1.

### Option A (recommended): EAS-managed signing key
This gives a stable fingerprint that survives across machines/CI.
1. In the repo: `cd mobile && npx eas credentials` (or `eas build` once).
   You'll need an Expo account (free). This creates/【shows the Android keystore.
2. From that output, copy the **SHA-1 fingerprint** of the keystore.
   - You can also see it later with `eas credentials` → Android → your build profile.

### Option B (quick, local debug build only)
Use a local Android **debug** keystore SHA-1. Downside: it's tied to whatever
machine built the debug app, so it's fine for a quick emulator test but not for
distribution. The debug SHA-1 from this session's VM is:

```
1F:90:75:12:B6:F6:45:EE:C7:1A:12:D5:69:B6:AF:79:44:71:60:55
```

(If you build the debug app on your own machine instead, get *its* SHA-1 with:
`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`.)

### Create the client
1. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
2. **Application type: Android**.
3. **Name**: `Branchwork Android`.
4. **Package name**: `com.branchwork.app`.
5. **SHA-1 certificate fingerprint**: paste the SHA-1 from Option A or B.
6. Click **Create**. Copy the **Client ID** and send it to me.

> You can register multiple SHA-1s over time (e.g. debug + EAS + Play App
> Signing) by creating additional Android OAuth clients with the same package
> and different fingerprints. Play Store distribution later needs the **Play App
> Signing** SHA-1 from the Play Console.

### CRITICAL: enable Custom URI scheme on the Android client
Google disables custom URI schemes by default on new Android OAuth clients, and
expo-auth-session's redirect uses one. Without this you get
`Error 400: invalid_request — Custom URI scheme is not enabled for your Android
client`.
1. Open the Android client → **Advanced settings**.
2. Toggle **Enable Custom URI scheme** → **Enabled** → Save (takes a few minutes
   to propagate).

---

## 3. App configuration (already done)

- `mobile/app.json`: the app registers **two** URL schemes,
  `["branchwork", "com.branchwork.app"]`. The second one is required:
  expo-auth-session's Google provider uses the redirect URI
  `com.branchwork.app:/oauthredirect` (the applicationId), so that scheme must be
  a registered intent filter or the ID token never returns to the app (the
  browser just lands on google.com). This covers both iOS and Android.
- `mobile/.env`: set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` /
  `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (git-ignored, local per machine).
- Backend `.env`: add both mobile client IDs to `GOOGLE_ALLOWED_AUDIENCES` so the
  server accepts ID tokens issued to the mobile clients.

## 4. Testing the real flow

- **Needs a dev/EAS build, not Expo Go** (Expo Go can't carry a custom OAuth
  client). Run `cd mobile && npx expo run:android` (or `run:ios` on a Mac).
- Verified on the Android emulator end-to-end: real Google account → consent →
  redirect back to the app → backend verifies the token → Board loads.

---

## TL;DR — what to send me
1. iOS client ID
2. Android client ID (+ which SHA-1 you registered, or "used the VM debug SHA-1")
3. Confirm the web client ID is unchanged
