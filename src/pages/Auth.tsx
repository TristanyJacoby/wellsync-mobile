import { IonContent, IonPage, IonInput } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { nativeGoogleCredential, nativeGoogleReady } from '../services/googleNative';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
};

function friendlyError(error: unknown): string {
  const code = (error as AuthError)?.code;
  return (code && ERROR_MESSAGES[code]) || 'Something went wrong. Please try again.';
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // The app stays locked behind the "verify your email" screen until they click the link.
        // A failed send isn't fatal: that screen has a Resend button.
        await sendEmailVerification(cred.user).catch((err) => console.error('Failed to send verification email', err));
      }
      // No navigation needed here - App.tsx's onAuthStateChanged listener
      // picks up the new session and swaps this screen out automatically.
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (Capacitor.isNativePlatform()) await signInWithCredential(auth, await nativeGoogleCredential());
      else await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div style={{ paddingTop: '14vh' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ margin: '0 0 28px', color: 'var(--ws-ink-muted)', fontSize: 14 }}>
            {mode === 'login' ? 'Sign in to sync your tasks.' : 'WellSync keeps your tasks synced across devices.'}
          </p>

          <IonInput
            fill="outline"
            label="Email"
            labelPlacement="stacked"
            type="email"
            value={email}
            onIonInput={(e) => setEmail(e.detail.value ?? '')}
            placeholder="you@example.com"
          />

          <div style={{ marginTop: 14 }}>
            <IonInput
              fill="outline"
              label="Password"
              labelPlacement="stacked"
              type="password"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value ?? '')}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: 'var(--ws-high-text)', marginTop: 14, fontSize: 13, fontWeight: 600 }}>
              {error}
            </p>
          )}

          <button className="ws-button-block" style={{ marginTop: 22 }} disabled={submitting} onClick={handleSubmit}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {Capacitor.isNativePlatform() && !nativeGoogleReady ? (
            // Without the Web client ID the app can't offer Google's own account picker (see googleNative.ts).
            <p className="ws-field-hint" style={{ marginTop: 14, textAlign: 'center' }}>
              Signed up with Google? Open the website, go to Profile &rarr; Edit profile &rarr; Set a password, then sign in
              here with your email and that password.
            </p>
          ) : (
            <button className="ws-button-google" style={{ marginTop: 10 }} disabled={submitting} onClick={handleGoogle}>
              Continue with Google
            </button>
          )}

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--ws-ink-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                fontWeight: 700,
                color: 'var(--ws-ink)',
                cursor: 'pointer',
              }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
