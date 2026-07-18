import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { guestApi } from '../lib/api';

const STORAGE_KEY = 'guest_token';
const GuestContext = createContext(null);

export function GuestProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
  });
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setGuest(null);
      return;
    }
    setLoading(true);
    guestApi.me()
      .then((data) => { if (active) setGuest(data.guest); })
      .catch(() => {
        if (active) {
          try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
          setToken(null);
          setGuest(null);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      guest,
      loading,
      isLoggedIn: Boolean(token && guest),
      login: (authToken, guestData) => {
        try { window.localStorage.setItem(STORAGE_KEY, authToken); } catch {}
        setToken(authToken);
        setGuest(guestData);
      },
      refresh: () => {
        if (!token) return Promise.resolve(null);
        return guestApi.me().then((data) => { setGuest(data.guest); return data.guest; });
      },
      logout: () => {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
        setToken(null);
        setGuest(null);
      }
    }),
    [token, guest, loading]
  );

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  return useContext(GuestContext);
}
