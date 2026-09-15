import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getTheme, saveTheme } from '../services/storage';
import { useAuth } from './AuthContext';
import type { Theme } from '../types';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// "Dark" (navy & gold) is WellSync's main theme - the default before a
// signed-in user's own Firestore preference loads, and for the Auth screen
// where there's no user/preference to load at all.
const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', setTheme: () => {} });

// Must be rendered inside AuthProvider - it reads the signed-in user to know
// when it's safe to read the theme from Firestore (storage.ts throws if
// called with no signed-in user).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function setTheme(next: Theme) {
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

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
