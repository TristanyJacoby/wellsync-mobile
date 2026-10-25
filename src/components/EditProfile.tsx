import { IonContent, IonIcon } from '@ionic/react';
import { cameraOutline, closeOutline, trashOutline } from 'ionicons/icons';
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { useRef, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { saveProfile } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { useAvatar } from '../contexts/AvatarContext';
import { fileToAvatarDataUrl } from '../utils/image';
import Avatar from './Avatar';
import type { OnboardingProfile } from '../types';

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'That current password is not right.',
  'auth/wrong-password': 'That current password is not right.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/requires-recent-login': 'For your security, sign out and back in, then try again.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/provider-already-linked': 'This account already has a password.',
  'auth/credential-already-in-use': 'That email already has a password login.',
};

function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  return AUTH_ERRORS[code] ?? 'Something went wrong. Try again.';
}

/** Photo, name and password for the signed-in account. Every change saves on its own button. */
export default function EditProfile({
  profile,
  onNameSaved,
  onClose,
}: {
  profile: OnboardingProfile | null;
  onNameSaved: (name: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { avatarUrl, hasCustomPhoto, setPhoto } = useAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name ?? '');
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hasPassword, setHasPassword] = useState(!!user?.providerData.some((p) => p.providerId === 'password'));
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || !profile) return;
    setBusy(true);
    try {
      await saveProfile({ ...profile, name: trimmed });
      onNameSaved(trimmed);
      setNameMsg({ ok: true, text: 'Name updated.' });
    } catch {
      setNameMsg({ ok: false, text: 'Could not save your name. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(file?: File) {
    if (!file) return;
    setBusy(true);
    setPhotoMsg(null);
    try {
      await setPhoto(await fileToAvatarDataUrl(file));
      setPhotoMsg({ ok: true, text: 'Photo updated.' });
    } catch (err) {
      setPhotoMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save that photo.' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removePhoto() {
    setBusy(true);
    try {
      await setPhoto(null);
      setPhotoMsg({ ok: true, text: 'Photo removed.' });
    } catch {
      setPhotoMsg({ ok: false, text: 'Could not remove the photo. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const email = auth.currentUser?.email;
    if (!email) return;
    setBusy(true);
    setPwMsg(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setPwMsg({ ok: true, text: `We sent a password reset link to ${email}.` });
    } catch (err) {
      setPwMsg({ ok: false, text: authMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    const u = auth.currentUser;
    if (!u?.email) return;
    if (next.length < 6) return setPwMsg({ ok: false, text: 'Choose a password with at least 6 characters.' });
    if (next !== confirm) return setPwMsg({ ok: false, text: 'The new passwords do not match.' });
    if (hasPassword && !current) return setPwMsg({ ok: false, text: 'Enter your current password.' });

    setBusy(true);
    setPwMsg(null);
    try {
      if (hasPassword) {
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
        await updatePassword(u, next);
        setPwMsg({ ok: true, text: 'Password updated.' });
      } else {
        // Google-only account: confirm it is really them, then add an email + password login.
        if (Capacitor.isNativePlatform()) {
          setPwMsg({ ok: false, text: 'Setting a password needs a browser. Open the WellSync website, sign in with Google and do it there.' });
          return;
        }
        await reauthenticateWithPopup(u, googleProvider);
        await linkWithCredential(u, EmailAuthProvider.credential(u.email, next));
        await u.reload();
        setHasPassword(true);
        setPwMsg({ ok: true, text: 'Password set. You can now sign in with your email too.' });
      }
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setPwMsg({ ok: false, text: authMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) =>
    m ? <p className={m.ok ? 'ws-ok' : 'ws-error'}>{m.text}</p> : null;

  return (
    <IonContent className="ion-padding">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
        <button className="ws-icon-btn" aria-label="Close" onClick={onClose}>
          <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Edit profile</h2>
        <span style={{ width: 44 }} />
      </div>

      <div className="ws-edit-pair">
        <section className="ws-glass-card ws-edit-section ws-edit-section--photo">
          <h3>Photo</h3>
          <Avatar name={name || user?.email || ''} photoURL={avatarUrl} size={72} />
          <button type="button" className="ws-button-block ws-button-block--sm ws-button-block--wide" disabled={busy} onClick={() => fileRef.current?.click()}>
            <IonIcon icon={cameraOutline} /> Upload photo
          </button>
          {hasCustomPhoto && (
            <button type="button" className="ws-edit-link" disabled={busy} onClick={removePhoto}>
              <IonIcon icon={trashOutline} /> Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
          <Msg m={photoMsg} />
        </section>

        <section className="ws-glass-card ws-edit-section">
          <h3>Name</h3>
          <input className="ws-plain-input" value={name} maxLength={40} aria-label="Name" onChange={(e) => setName(e.target.value)} />
          <button type="button" className="ws-button-block ws-button-block--sm ws-button-block--right" disabled={busy || !name.trim() || name.trim() === profile?.name} onClick={saveName}>
            Save name
          </button>
          <Msg m={nameMsg} />
        </section>
      </div>

      <section className="ws-glass-card ws-edit-section">
        <h3>{hasPassword ? 'Change password' : 'Set a password'}</h3>
        {!hasPassword && (
          <p className="ws-field-hint">
            You signed in with Google, so there is no password yet. Add one to also sign in with {user?.email}. Google will ask you to confirm it is you.
          </p>
        )}
        {hasPassword && (
          <input
            className="ws-plain-input"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
        <input className="ws-plain-input" type="password" autoComplete="new-password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} />
        <input className="ws-plain-input" type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <div className="ws-edit-actions">
          {hasPassword ? (
            <button type="button" className="ws-edit-link ws-edit-link--plain" disabled={busy} onClick={forgotPassword}>
              Forgot password?
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="ws-button-block ws-button-block--sm" disabled={busy || !next || !confirm} onClick={changePassword}>
            {hasPassword ? 'Update password' : 'Set password'}
          </button>
        </div>
        <Msg m={pwMsg} />
      </section>
    </IonContent>
  );
}
