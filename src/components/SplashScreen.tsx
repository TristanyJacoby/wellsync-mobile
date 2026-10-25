import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SHOW_MS = 1900; // long enough for the ring and check to draw, then the name to appear
const SHOW_MS_REDUCED = 700;
const FADE_MS = 450;

/**
 * A short animated splash on launch: the gold ring draws itself, the check
 * ticks in, then the name fades up. It matches the native launch screen (same
 * mark, same navy), so opening the app feels like one continuous animation.
 * It stays until the sign-in check has finished, so it never flashes a blank
 * screen, and unmounts after fading out.
 */
export default function SplashScreen() {
  const { checkingAuth } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setMinElapsed(true), reduced ? SHOW_MS_REDUCED : SHOW_MS);
    return () => clearTimeout(t);
  }, []);

  const leaving = minElapsed && !checkingAuth;

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;

  return (
    <div className={`ws-splash${leaving ? ' is-leaving' : ''}`} role="img" aria-label="WellSync">
      <svg className="ws-splash__mark" viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
        <circle cx="60" cy="60" r="40" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="8" />
        <circle
          className="ws-splash__arc"
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke="#e0b04d"
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        <path
          className="ws-splash__check"
          d="M40 62 L55 77 L82 46"
          fill="none"
          stroke="#fff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="ws-splash__name">WellSync</p>
      <p className="ws-splash__tagline">Plan smarter. Feel better.</p>
    </div>
  );
}
