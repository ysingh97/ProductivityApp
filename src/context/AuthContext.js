import React, { createContext, useContext, useEffect, useState } from 'react';
import { isTokenExpired } from './authUtils';

const AuthContext = createContext(null);

const markAuthExpired = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('authExpired', '1');
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) return null;
    if (isTokenExpired(storedToken)) {
      markAuthExpired();
      return null;
    }
    return storedToken;
  });
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) return null;
    if (isTokenExpired(storedToken)) {
      markAuthExpired();
      return null;
    }
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('authUser');
    }
  }, [user]);

  const saveAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, saveAuth, logout, isAuthed: Boolean(token) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
