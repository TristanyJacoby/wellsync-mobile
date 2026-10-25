# Android app (debug APK)

Build: `./scripts/build-android.sh` (needs Android Studio's SDK and a Java 17/21 runtime).
The APK lands at `WellSync-debug.apk` in the project root (gitignored).

Install: send the APK to the phone and open it (allow "Install unknown apps" for the app you
opened it from), or with a cable and USB debugging on:
`~/Library/Android/sdk/platform-tools/adb install -r WellSync-debug.apk`

## What the build script adds

`android/` is gitignored, so `scripts/build-android.sh` applies everything custom each time:
Gradle wrapper 8.7, the `SCHEDULE_EXACT_ALARM` permission, and the app icon and launch screen
generated from the one logo, `assets/logo.png` (2000x2000, yellow `#ffde59`). To change the logo, replace that
file and run `node scripts/make-assets.mjs`; it rebuilds `assets/*.png` and `public/logo.png` (browser tab icon
and the in-app splash).

## Google sign-in inside the app (one-time Firebase setup)

A browser popup cannot open in an Android WebView, so the app uses Android's own account
picker. It switches on when the project's Web client ID is in `.env`:

1. Firebase console > Project settings > Your apps > **Add app > Android**.
   Package name `com.wellworksco.wellsync`; SHA-1 certificate fingerprint = the debug key of the
   Mac that builds the APK. Print it with
   `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`.
   (You can skip the `google-services.json` download.)
2. Firebase console > Authentication > Sign-in method > **Google** > Web SDK configuration >
   copy the **Web client ID**.
3. Add `VITE_GOOGLE_WEB_CLIENT_ID=<that id>` to `.env`, then rebuild the APK.

Without it the app shows an email + password hint instead of the Google button (set a password
on the website first: Profile > Edit profile > Set a password).

## Reminders

Tap "Turn on reminders" in the notification center. Android 12+ also needs
**Alarms & reminders** allowed for WellSync (the button opens that settings page once);
without it reminders can arrive late.

## WellBot and Plus

The app has no server of its own: it calls the deployed site (`VITE_API_BASE_URL`, default
`https://wellsync-mobile.vercel.app`). `api/_lib/cors.ts` allows the app's origin.
