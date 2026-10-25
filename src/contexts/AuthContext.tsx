import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextValue {
  user: User | null;
  checkingAuth: boolean;
  /** Re-reads the account from Firebase (e.g. after the user verifies their email) and re-renders. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ user: null, checkingAuth: true, refreshUser: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // reload() mutates the same User object, so a counter is what makes consumers re-render.
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
  }, []);

  const refreshUser = useCallback(async () => {
    await auth.currentUser?.reload();
    setRefreshes((n) => n + 1);
  }, []);

  // `refreshes` is a dependency on purpose: a new value object after each reload.
  const value = useMemo(() => ({ user, checkingAuth, refreshUser }), [user, checkingAuth, refreshUser, refreshes]); // eslint-disable-line react-hooks/exhaustive-deps

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
