import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * A card over a blurred, dimmed screen that eases in slowly. Mounts on open
 * and unmounts after the exit transition. Styled by the .ws-premium rules in
 * variables.css (shared by every pop-up card in the app).
 */
export default function PopupCard({
  open,
  onClose,
  label,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /** False keeps the card up until a button inside it closes it (backdrop taps do nothing). */
  dismissible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  // Mount first, then flip to "shown" a frame later so the transition runs.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 600);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div className={`ws-premium${shown ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="ws-premium__backdrop" onClick={dismissible ? onClose : undefined} />
      <div className="ws-premium__card">{children}</div>
    </div>,
    document.body
  );
}
