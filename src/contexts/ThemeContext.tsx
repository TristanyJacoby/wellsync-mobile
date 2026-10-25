import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getTheme, saveTheme } from '../services/storage';
import { useAuth } from './AuthContext';
import { usePlan } from './PlanContext';
import { isPremiumTheme, premiumThemeCss, rememberTheme } from '../theme/themes';
import type { Theme } from '../types';

interface ThemeContextValue {
  /** The theme the user picked (may be a premium one they can no longer use). */
  theme: Theme;
  /** What is actually applied: a lapsed premium theme falls back to Dark. */
  appliedTheme: Theme;
  /** Premium themes open the upgrade pop-up for free accounts instead of applying. */
  setTheme: (theme: Theme) => void;
}

// "Dark" (navy & gold) is WellSync's main theme - the default before a
// signed-in user's own Firestore preference loads, and for the Auth screen
// where there's no user/preference to load at all.
const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', appliedTheme: 'dark', setTheme: () => {} });

// Must be rendered inside AuthProvider - it reads the signed-in user to know
// when it's safe to read the theme from Firestore (storage.ts throws if
// called with no signed-in user).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { plan, isPlus, showPremium } = usePlan();
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    if (!user) {
      setThemeState('dark');
      return;
    }
    getTheme()
      .then(setThemeState)
      .catch((err) => console.error('Failed to load theme', err));
  }, [user]);

  // The whole app's colors are driven by CSS custom properties scoped under
  // :root[data-theme="dark"] in variables.css - this attribute is the only
  // thing that switches them.
  // Premium themes are generated from palettes (theme/themes.ts), not written
  // out in variables.css; inject them once.
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'ws-premium-themes';
    style.textContent = premiumThemeCss();
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // A premium theme only applies while the plan is Plus. While the plan is
  // still loading the saved theme is shown as-is, to avoid a flash.
  const appliedTheme: Theme = plan !== null && !isPlus && isPremiumTheme(theme) ? 'dark' : theme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appliedTheme);
    rememberTheme(appliedTheme);
  }, [appliedTheme]);

  function setTheme(next: Theme) {
    if (isPremiumTheme(next) && !isPlus) {
      showPremium('Premium themes are part of WellSync Plus.');
      return;
    }
    // A brief global transition class, added only for explicit user-driven
    // switches (never on initial load/boot, which would otherwise fade in
    // from nothing) - see the .ws-theme-transitioning rule in variables.css.
    document.documentElement.classList.add('ws-theme-transitioning');
    window.setTimeout(() => {
      document.documentElement.classList.remove('ws-theme-transitioning');
    }, 400);

    // Apply immediately for a snappy UI; persist in the background rather
    // than waiting on the round-trip before the app visibly changes.
    setThemeState(next);
    saveTheme(next).catch((err) => console.error('Failed to save theme', err));
  }

  return <ThemeContext.Provider value={{ theme, appliedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
