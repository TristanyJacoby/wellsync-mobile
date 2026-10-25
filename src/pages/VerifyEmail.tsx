import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { mailOutline } from 'ionicons/icons';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useVerificationEmail } from '../hooks/useVerificationEmail';
import PopupCard from '../components/PopupCard';

/**
 * Shown instead of the app to a new email sign-up until they click the link
 * in their inbox. A pop-up tells them to check their email; the page keeps
 * checking in the background and lets them in as soon as they verify.
 */
export default function VerifyEmail() {
  const { user, refreshUser } = useAuth();
  const { send, sending, error, cooldown } = useVerificationEmail();
  const [popup, setPopup] = useState(true);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  // Let them in the moment the link has been clicked, without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => refreshUser().catch(() => undefined), 4000);
    return () => clearInterval(id);
  }, [refreshUser]);

  async function check() {
    setChecking(true);
    setNotYet(false);
    try {
      await refreshUser();
      if (!auth.currentUser?.emailVerified) setNotYet(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div className="ws-verify">
          <span className="ws-verify__icon">
            <IonIcon icon={mailOutline} />
          </span>
          <h1>Verify your email</h1>
          <p>
            We sent a verification link to <strong>{user?.email}</strong>. Open it, then come back here. You can use WellSync as soon as your email is verified.
          </p>
          <p className="ws-field-hint">Can&apos;t find it? Check your spam or promotions folder.</p>

          <button className="ws-button-block" disabled={checking} onClick={check}>
            {checking ? 'Checking…' : 'I’ve verified my email'}
          </button>
          {notYet && <p className="ws-error">Not verified yet. Open the link in the email first.</p>}

          <button className="ws-button-google" disabled={sending || cooldown > 0} onClick={send}>
            {sending ? 'Sending…' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
          </button>
          {error && <p className="ws-error">{error}</p>}

          <button type="button" className="ws-premium__later" onClick={() => signOut(auth)}>
            Use a different account
          </button>
        </div>
      </IonContent>

      <PopupCard open={popup} onClose={() => setPopup(false)} label="Check your email" dismissible={false}>
        <span className="ws-premium__badge">
          <IonIcon icon={mailOutline} style={{ fontSize: 26 }} />
        </span>
        <h3>Check your email</h3>
        <p className="ws-premium__reason">
          We sent a verification link to <strong>{user?.email}</strong>. You need to verify your email before you can use WellSync.
        </p>
        <button className="ws-button-block" onClick={() => setPopup(false)}>
          OK, I’ll check
        </button>
      </PopupCard>
    </IonPage>
  );
}
