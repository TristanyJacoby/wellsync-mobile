import { IonIcon } from '@ionic/react';
import { checkmarkCircleOutline, closeOutline, colorPaletteOutline, gridOutline, optionsOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import PopupCard from './PopupCard';
import { usePlan } from '../contexts/PlanContext';
import WellBotIcon from './WellBotIcon';

const PERKS = [
  { icon: gridOutline, text: 'All six prioritization frameworks' },
  { icon: colorPaletteOutline, text: 'Premium color themes' },
  { icon: optionsOutline, text: 'Change your preferences any time' },
];

/**
 * The WellSync Plus pop-up: a card over a blurred, dimmed screen that eases
 * in slowly. Checkout is a demo - no payment is taken.
 */
export default function PremiumSheet({ open, reason, onClose }: { open: boolean; reason?: string; onClose: () => void }) {
  const { subscribe, isPlus } = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setDone(false);
      setError('');
    }
  }, [open]);

  async function handleSubscribe() {
    setBusy(true);
    setError('');
    try {
      await subscribe();
      setDone(true);
    } catch {
      setError('Could not start your plan. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PopupCard open={open} onClose={onClose} label="WellSync Plus">
        <button className="ws-premium__close ws-round-btn" aria-label="Close" onClick={onClose}>
          <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
        </button>

        <span className="ws-premium__badge">
          <WellBotIcon size={26} />
        </span>
        <span className="ws-plus__tag">Demo · no payment is taken</span>
        <h3>{done || isPlus ? "You're on WellSync Plus" : 'WellSync Plus'}</h3>
        {reason && !done && !isPlus && <p className="ws-premium__reason">{reason}</p>}

        {done || isPlus ? (
          <>
            <p className="ws-premium__reason">Everything is unlocked. Enjoy!</p>
            <ul className="ws-premium__perks">
              <li>
                <IonIcon icon={checkmarkCircleOutline} /> All frameworks, themes and preferences are open.
              </li>
              <li>
                <IonIcon icon={checkmarkCircleOutline} /> WellBot is ready on the + button.
              </li>
            </ul>
            <button className="ws-button-block" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <p className="ws-plus__price">
              ₱149<span>/month</span>
            </p>
            <ul className="ws-premium__perks">
              {PERKS.map((p) => (
                <li key={p.text}>
                  <IonIcon icon={p.icon} /> {p.text}
                </li>
              ))}
              <li>
                <WellBotIcon size={18} /> WellBot, the task assistant
              </li>
            </ul>
            <button className="ws-button-block" disabled={busy} onClick={handleSubscribe}>
              {busy ? 'Subscribing…' : 'Subscribe'}
            </button>
            <button className="ws-premium__later" onClick={onClose}>
              Not now
            </button>
            {error && <p className="ws-error">{error}</p>}
          </>
        )}
    </PopupCard>
  );
}
