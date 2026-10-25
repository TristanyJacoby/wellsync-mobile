import { IonIcon } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useVerificationEmail } from '../hooks/useVerificationEmail';
import { isUnverified } from '../utils/verification';

/** "Account setup needed" notice for an email account that has not verified its address yet. */
export default function VerifyBanner() {
  const { user, refreshUser } = useAuth();
  const { send, sending, sent, error, cooldown } = useVerificationEmail();
  const [checking, setChecking] = useState(false);

  if (!isUnverified(user)) return null;

  async function check() {
    setChecking(true);
    try {
      await refreshUser();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="ws-glass-card ws-verify-banner" role="status">
      <span className="ws-verify-banner__icon">
        <IonIcon icon={alertCircleOutline} />
      </span>
      <div className="ws-verify-banner__text">
        <strong>Account setup needed: verify email</strong>
        <span>{sent ? `We sent a link to ${user?.email}. Open it, then tap “I’ve verified”.` : 'Verify your email to finish setting up your account.'}</span>
        {error && <span className="ws-error">{error}</span>}
        <div className="ws-verify-banner__actions">
          <button type="button" className="ws-button-block ws-button-block--sm" disabled={sending || cooldown > 0} onClick={send}>
            {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : sent ? 'Resend' : 'Verify email'}
          </button>
          {sent && (
            <button type="button" className="ws-edit-link ws-edit-link--plain" disabled={checking} onClick={check}>
              {checking ? 'Checking…' : 'I’ve verified'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
