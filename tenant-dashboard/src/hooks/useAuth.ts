import { useState, useCallback } from 'react';
import { authStorage } from '../api/client';
import { authApi } from '../api/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Drop the old key-only credential so it cannot be reused.
    try {
      localStorage.removeItem('admin_key');
    } catch {
      /* storage unavailable */
    }
    return authStorage.isSignedIn;
  });

  const login = useCallback((token: string) => {
    authStorage.setToken(token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(); // revokes the session server-side
    } catch {
      /* already expired — clear locally anyway */
    }
    authStorage.clear();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
