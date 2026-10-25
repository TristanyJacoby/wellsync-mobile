import { IonIcon } from '@ionic/react';
import { addOutline, createOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import WellBotIcon from './WellBotIcon';

interface Anchor {
  right: number;
  bottom: number;
}

/**
 * Bottom-right "+" on Home. Tapping it blurs and dims the whole screen and
 * pops two actions out of the button. The open state is drawn in a portal on
 * <body> so the backdrop also covers the tab bar; the portal's button sits at
 * the exact spot of the real one, which is hidden meanwhile.
 */
export default function HomeFab({ onCreateTask, onOpenAssistant }: { onCreateTask: () => void; onOpenAssistant: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [open, setOpen] = useState(false);
  // Extra px to raise the button so it always clears the floating tab bar.
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const GAP = 16;
    function clearTabBar() {
      const btn = ref.current?.getBoundingClientRect();
      const bar = document.querySelector('ion-tab-bar')?.getBoundingClientRect();
      // Hidden tab pages report an empty rect; leave those alone.
      if (!btn || !bar || !btn.width || !bar.width) return;
      setLift((cur) => Math.max(0, btn.bottom + cur - bar.top + GAP));
    }
    clearTabBar();
    const t = setTimeout(clearTabBar, 400); // after Ionic's page transition settles
    window.addEventListener('resize', clearTabBar);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', clearTabBar);
    };
  }, []);

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setAnchor({ right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom });
    // One frame later so the CSS transition has a start state to animate from.
    requestAnimationFrame(() => setOpen(true));
  }

  function hide(then?: () => void) {
    setOpen(false);
    setTimeout(() => {
      setAnchor(null);
      then?.();
    }, 200);
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="ws-fab"
        style={{ marginBottom: lift, ...(anchor ? { visibility: 'hidden' } : {}) }}
        aria-label="Add"
        aria-haspopup="menu"
        onClick={show}
      >
        <IonIcon icon={addOutline} />
      </button>

      {anchor &&
        createPortal(
          <div className={`ws-fab-layer${open ? ' is-open' : ''}`} role="presentation">
            <div className="ws-fab-backdrop" onClick={() => hide()} />
            <div className="ws-fab-menu" role="menu" style={{ right: anchor.right, bottom: anchor.bottom }}>
              <button role="menuitem" type="button" className="ws-fab-item ws-fab-item--2" onClick={() => hide(onOpenAssistant)}>
                <span className="ws-fab-item__label">
                  <strong>Ask WellBot</strong>
                  <span>Describe it, get a task</span>
                </span>
                <span className="ws-fab-item__icon ws-fab-item__icon--ai">
                  <WellBotIcon size={24} />
                </span>
              </button>
              <button role="menuitem" type="button" className="ws-fab-item ws-fab-item--1" onClick={() => hide(onCreateTask)}>
                <span className="ws-fab-item__label">
                  <strong>Create task</strong>
                  <span>Fill in the details</span>
                </span>
                <span className="ws-fab-item__icon">
                  <IonIcon icon={createOutline} />
                </span>
              </button>
              <button type="button" className="ws-fab ws-fab--close" aria-label="Close menu" onClick={() => hide()}>
                <IonIcon icon={addOutline} />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
