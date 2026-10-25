import { sendEmailVerification } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';

const COOLDOWN_SECONDS = 60; // Firebase throttles repeated sends, so pace them

/** Sends the verification email to the signed-in user, with a cooldown between sends. */
export function useVerificationEmail() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    const user = auth.currentUser;
    if (!user || sending || cooldown > 0) return;
    setSending(true);
    setError('');
    try {
      await sendEmailVerification(user);
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(code === 'auth/too-many-requests' ? 'Too many requests. Wait a few minutes and try again.' : 'Could not send the email. Try again.');
    } finally {
      setSending(false);
    }
  }

  return { send, sending, sent, error, cooldown };
}
