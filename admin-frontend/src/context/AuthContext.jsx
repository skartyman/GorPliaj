import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const updateUser = useCallback((nextUser) => {
    requestIdRef.current += 1;
    setUser(nextUser);
    setLoading(false);
  }, []);

  const fetchUser = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    apiRequest('/api/admin/auth/me')
      .then(({ response, body }) => {
        if (requestId !== requestIdRef.current) return;
        setUser(response.ok ? body.admin || null : null);
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setUser(null);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, loading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
