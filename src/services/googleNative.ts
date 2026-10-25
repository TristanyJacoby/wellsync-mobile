import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { GoogleAuthProvider, type AuthCredential } from 'firebase/auth';

// Inside the installed app, Google sign-in uses Android's own account picker (a
// browser popup can't open in a WebView). It needs the project's *Web* OAuth
// client ID in VITE_GOOGLE_WEB_CLIENT_ID; without it the app falls back to
// email + password and Auth.tsx explains how.
const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

export const nativeGoogleReady = Capacitor.isNativePlatform() && !!WEB_CLIENT_ID;

let initialized: Promise<void> | null = null;

/** Shows the Android Google account picker and returns a Firebase credential for the chosen account. */
export async function nativeGoogleCredential(): Promise<AuthCredential> {
  initialized ??= SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } });
  await initialized;
  // No `scopes`: the plugin refuses them unless MainActivity is customized, and the ID token already carries email and profile.
  const { result } = await SocialLogin.login({ provider: 'google', options: {} });
  if (result.responseType !== 'online' || !result.idToken) throw new Error('Google did not return an ID token.');
  return GoogleAuthProvider.credential(result.idToken);
}
