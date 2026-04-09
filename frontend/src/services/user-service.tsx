import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface User {
  userId?: string;
  username?: string;
  name: string;
  givenName?: string;
  surname?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

interface UserContextValue {
  user: User | null;
  loading: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * Calls the BFF's /me endpoint with the session cookie. Returns null on 401
 * (not logged in) and lets other errors throw so callers can decide.
 */
async function fetchMe(): Promise<User | null> {
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    credentials: 'include',
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Failed to fetch user: HTTP ${response.status}`);
  const body = (await response.json()) as { data: User };
  return body.data;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await fetchMe());
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ user, loading, reload, logout }), [user, loading, reload, logout]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
