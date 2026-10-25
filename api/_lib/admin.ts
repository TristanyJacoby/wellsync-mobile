import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// FIREBASE_SERVICE_ACCOUNT is the service-account JSON from the Firebase
// console, pasted whole into a Vercel environment variable. Server-only:
// it must never get a VITE_ prefix.
function app() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export type Plan = 'free' | 'plus';

/** Verifies the caller's Firebase ID token; answers 401 and returns null if it's missing or bad. */
export async function authenticate(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'unauthenticated' });
    return null;
  }
  try {
    return (await getAuth(app()).verifyIdToken(token)).uid;
  } catch {
    res.status(401).json({ error: 'unauthenticated' });
    return null;
  }
}

export function userDoc(uid: string) {
  return getFirestore(app()).collection('users').doc(uid);
}

export async function getPlan(uid: string): Promise<Plan> {
  const snap = await userDoc(uid).get();
  return snap.data()?.plan === 'plus' ? 'plus' : 'free';
}
