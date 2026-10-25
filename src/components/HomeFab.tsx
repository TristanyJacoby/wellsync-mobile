import { IonIcon } from '@ionic/react';
import { addOutline, createOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import WellBotIcon from './WellBotIcon';

interface Anchor {
  right: number;
  bottom: number;
}

const GAP_ABOVE_TAB_BAR = 16;
const FALLBACK_BOTTOM = 96;

/**
 * The app-wide "+" button, docked just above the tab bar on every tab.
 * Tapping it blurs and dims the whole screen and pops two actions out of the
 * button. The open state is drawn in a portal on <body> so the backdrop also
 * covers the tab bar; the portal's button sits at the exact spot of the real
 * one, which is hidden meanwhile.
 */
export default function HomeFab({ onCreateTask, onOpenAssistant }: { onCreateTask: () => void; onOpenAssistant: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [open, setOpen] = useState(false);
  const [bottom, setBottom] = useState(FALLBACK_BOTTOM);

  // Sit a fixed gap above the floating tab bar, wherever it ends up (safe
  // areas, orientation changes, browser toolbars).
  useEffect(() => {
    const bar = document.querySelector('ion-tab-bar');
    function place() {
      const rect = bar?.getBoundingClientRect();
      if (rect?.height) setBottom(window.innerHeight - rect.top + GAP_ABOVE_TAB_BAR);
    }
    place();
    const t = setTimeout(place, 400); // after first layout settles
    window.addEventListener('resize', place);
    const observer = bar && 'ResizeObserver' in window ? new ResizeObserver(place) : null;
    if (bar) observer?.observe(bar);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', place);
      observer?.disconnect();
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
      <div className="ws-fab-dock" style={{ bottom }}>
        <button
          ref={ref}
          type="button"
          className="ws-fab"
          style={anchor ? { visibility: 'hidden' } : undefined}
          aria-label="Add"
          aria-haspopup="menu"
          onClick={show}
        >
          <IonIcon icon={addOutline} />
        </button>
      </div>

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
