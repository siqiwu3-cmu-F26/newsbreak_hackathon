import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/auth.js';
import { tokenStore } from '../services/auth.js';

const AuthContext = createContext(null);

const anonymous = { status: 'anonymous', user: null, balance: 0 };

export function AuthProvider({ children }) {
  // With no saved token there is nothing to restore, so skip the loading state entirely.
  const [state, setState] = useState(() => (tokenStore.get() ? { ...anonymous, status: 'loading' } : anonymous));

  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let cancelled = false;
    authApi.fetchMe()
      .then(({ user, credits }) => {
        if (!cancelled) setState({ status: 'authenticated', user, balance: credits.balance });
      })
      .catch((error) => {
        if (cancelled) return;
        // Only drop the token when the server says it's invalid, not when it's merely unreachable.
        if (error.status === 401) tokenStore.clear();
        setState(anonymous);
      });
    return () => { cancelled = true; };
  }, []);

  const startSession = useCallback(({ token, user, credits }) => {
    tokenStore.set(token);
    setState({ status: 'authenticated', user, balance: credits.balance });
  }, []);

  const login = useCallback(async (credentials) => startSession(await authApi.login(credentials)), [startSession]);
  const signup = useCallback(async (details) => startSession(await authApi.signup(details)), [startSession]);

  const logout = useCallback(async () => {
    // Sign out locally first so it's instant and can't be undone by a slow or failed request.
    const token = tokenStore.get();
    tokenStore.clear();
    setState(anonymous);
    try { await authApi.logout(token); } catch { /* the server session expires on its own */ }
  }, []);

  const verifyIdentity = useCallback(async (details) => {
    try {
      const result = await authApi.verifyIdentity(details);
      setState((current) => ({ ...current, user: result.user, balance: result.credits.balance }));
      return result;
    } catch (error) {
      // A rejected attempt still updates the account status shown in the UI.
      if (error.data?.user) setState((current) => ({ ...current, user: error.data.user }));
      throw error;
    }
  }, []);

  const setBalance = useCallback((balance) => setState((current) => ({ ...current, balance })), []);

  const value = useMemo(
    () => ({ ...state, login, signup, logout, verifyIdentity, setBalance }),
    [state, login, signup, logout, verifyIdentity, setBalance],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export const isVerified = (user) => user?.verification?.status === 'verified';
