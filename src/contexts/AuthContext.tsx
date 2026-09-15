import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextValue {
  user: User | null;
  checkingAuth: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, checkingAuth: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
  }, []);

  return <AuthContext.Provider value={{ user, checkingAuth }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
