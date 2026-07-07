import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { isTokenExpired } from '@productivity/shared';
import * as tokenStore from '../api/tokenStore';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(null);
  const [user, setUserState] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(async () => {
    setTokenState(null);
    setUserState(null);
    await tokenStore.clearAuth();
  }, []);

  const saveAuth = useCallback(async (newToken, newUser) => {
    setTokenState(newToken);
    setUserState(newUser);
    await tokenStore.setToken(newToken);
    await tokenStore.setUser(newUser);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let active = true;
    (async () => {
      const storedToken = await tokenStore.getToken();
      if (!active) return;
      if (!storedToken || isTokenExpired(storedToken)) {
        await tokenStore.clearAuth();
        if (active) setRestoring(false);
        return;
      }
      const storedUser = await tokenStore.getUser();
      if (!active) return;
      setTokenState(storedToken);
      setUserState(storedUser);
      setRestoring(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      restoring,
      isAuthed: Boolean(token),
      saveAuth,
      logout
    }),
    [token, user, restoring, saveAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
