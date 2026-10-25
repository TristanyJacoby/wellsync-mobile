#!/usr/bin/env bash
# Builds a debug APK of WellSync: ./scripts/build-android.sh
# Output: WellSync-debug.apk in the project root. android/ is gitignored, so
# everything the native project needs beyond Capacitor's defaults is applied here.
set -euo pipefail
cd "$(dirname "$0")/.."

# Gradle 8.x runs on Java 17-21. Java 25 (the Mac default here) is too new.
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -qE 'version "(17|21)\.'; then
  JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)"
fi
[ -n "$JAVA_HOME" ] || { echo "Need Java 17 or 21 (Android Studio ships one)."; exit 1; }
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

echo "==> Web build"
npm run build

[ -d android ] || npx cap add android
echo "==> Sync"
npx cap sync android

echo "==> Native project tweaks"
echo "sdk.dir=$SDK" > android/local.properties
# Capacitor 6's Gradle 8.2.1 cannot run on Java 21.
sed -i '' 's#gradle-8.2.1-all.zip#gradle-8.7-all.zip#' android/gradle/wrapper/gradle-wrapper.properties
# Reminders: let Android 12+ schedule exact alarms (the user still grants it once in Settings).
MANIFEST=android/app/src/main/AndroidManifest.xml
grep -q SCHEDULE_EXACT_ALARM "$MANIFEST" || sed -i '' 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />#' "$MANIFEST"
# The Google sign-in plugin bundles Facebook's SDK, which adds advertising-ID permissions this app never uses.
grep -q 'xmlns:tools' "$MANIFEST" || sed -i '' 's#<manifest xmlns:android="http://schemas.android.com/apk/res/android"#<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"#' "$MANIFEST"
for perm in com.google.android.gms.permission.AD_ID android.permission.ACCESS_ADSERVICES_ATTRIBUTION android.permission.ACCESS_ADSERVICES_AD_ID android.permission.ACCESS_ADSERVICES_CUSTOM_AUDIENCE android.permission.ACCESS_ADSERVICES_TOPICS; do
  grep -q "$perm" "$MANIFEST" || sed -i '' "s#<uses-permission android:name=\"android.permission.INTERNET\" />#<uses-permission android:name=\"android.permission.INTERNET\" />\n    <uses-permission android:name=\"$perm\" tools:node=\"remove\" />#" "$MANIFEST"
done
# Android 12+ draws its own launch window before the app; give it the default theme's navy instead of white.
STYLES=android/app/src/main/res/values/styles.xml
sed -i '' '/windowSplashScreenBackground/d' "$STYLES"
sed -i '' 's#<item name="android:background">@drawable/splash</item>#<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">\#16212e</item>#' "$STYLES"
# App icon and launch screen from assets/*.png
npx capacitor-assets generate --android --iconBackgroundColor '#ffde59' --splashBackgroundColor '#16212e' > /dev/null

echo "==> Gradle"
(cd android && ./gradlew assembleDebug --no-daemon -q)
cp android/app/build/outputs/apk/debug/app-debug.apk WellSync-debug.apk
echo "Built WellSync-debug.apk ($(du -h WellSync-debug.apk | cut -f1))"
