import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SHOW_MS = 1900; // long enough for the logo to land and the name to appear
const SHOW_MS_REDUCED = 700;
const FADE_MS = 450;

/**
 * A short animated splash on launch: the logo pops in, then the name and tagline rise
 * under it. It matches the native launch screen (same logo, same yellow), so opening
 * the app feels like one continuous animation. It stays until the sign-in check has
 * finished, so it never flashes a blank screen, and unmounts after fading out.
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
      <img className="ws-splash__logo" src="/logo.png" alt="" width="220" height="220" />
      <p className="ws-splash__name">WellSync</p>
      <p className="ws-splash__tagline">Plan smarter. Feel better.</p>
    </div>
  );
}
