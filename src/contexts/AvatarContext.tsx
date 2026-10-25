import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPhoto, savePhoto } from '../services/storage';
import { useAuth } from './AuthContext';

interface AvatarValue {
  /** The picture to show: an uploaded one, else the Google account's, else null (initials). */
  avatarUrl: string | null;
  hasCustomPhoto: boolean;
  setPhoto: (dataUrl: string | null) => Promise<void>;
}

const AvatarContext = createContext<AvatarValue>({ avatarUrl: null, hasCustomPhoto: false, setPhoto: async () => {} });

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [photo, setPhotoState] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPhotoState(null);
      return;
    }
    getPhoto()
      .then(setPhotoState)
      .catch((err) => console.error('Failed to load profile photo', err));
  }, [user]);

  const setPhoto = useCallback(async (dataUrl: string | null) => {
    await savePhoto(dataUrl);
    setPhotoState(dataUrl);
  }, []);

  const value = useMemo(
    () => ({ avatarUrl: photo ?? user?.photoURL ?? null, hasCustomPhoto: !!photo, setPhoto }),
    [photo, user?.photoURL, setPhoto]
  );
  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar() {
  return useContext(AvatarContext);
}
