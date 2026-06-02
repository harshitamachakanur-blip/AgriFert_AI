import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// ── Demo mode: works without a real backend ──────────────────────────────────
const DEMO_USERS_KEY = 'agrifert_demo_users';
const DEMO_TOKEN_PREFIX = 'demo_token_';

function getDemoUsers() {
  try { return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '{}'); }
  catch { return {}; }
}

function saveDemoUser(email, userData) {
  const users = getDemoUsers();
  users[email] = userData;
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

function makeDemoToken(email) {
  return DEMO_TOKEN_PREFIX + btoa(email + ':' + Date.now());
}

function isDemoToken(token) {
  return token && token.startsWith(DEMO_TOKEN_PREFIX);
}

function getDemoUserFromToken(token) {
  if (!isDemoToken(token)) return null;
  try {
    const payload = atob(token.replace(DEMO_TOKEN_PREFIX, ''));
    const email = payload.split(':')[0];
    const users = getDemoUsers();
    return users[email] || null;
  } catch { return null; }
}
// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('agrifert_token');
    if (!token) { setLoading(false); return; }

    // Demo token — resolve locally without hitting backend
    if (isDemoToken(token)) {
      const demoUser = getDemoUserFromToken(token);
      if (demoUser) {
        setUser(demoUser);
      } else {
        localStorage.removeItem('agrifert_token');
      }
      setLoading(false);
      return;
    }

    // Real backend token
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    API.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('agrifert_token');
        delete API.defaults.headers.common['Authorization'];
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    // Try real backend first
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('agrifert_token', data.token);
      API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data.user);
      return data;
    } catch (backendErr) {
      // If backend is unreachable (network error) — try demo fallback
      if (!backendErr.response) {
        const users = getDemoUsers();
        const stored = users[email.toLowerCase()];
        if (!stored || stored.password !== password) {
          throw { response: { data: { message: 'Invalid email or password' } } };
        }
        const token = makeDemoToken(email.toLowerCase());
        const userData = { _id: stored._id, name: stored.name, email: stored.email, role: 'user' };
        localStorage.setItem('agrifert_token', token);
        setUser(userData);
        return { token, user: userData };
      }
      throw backendErr;
    }
  };

  const register = async (name, email, password) => {
    // Try real backend first
    try {
      const { data } = await API.post('/auth/register', { name, email, password });
      localStorage.setItem('agrifert_token', data.token);
      API.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data.user);
      return data;
    } catch (backendErr) {
      // If backend is unreachable — register in demo mode
      if (!backendErr.response) {
        const users = getDemoUsers();
        const key = email.toLowerCase();
        if (users[key]) {
          throw { response: { data: { message: 'Email already registered. Please login.' } } };
        }
        const newUser = {
          _id: 'demo_' + Date.now(),
          name, email: key, password, role: 'user'
        };
        saveDemoUser(key, newUser);
        const token = makeDemoToken(key);
        const userData = { _id: newUser._id, name, email: key, role: 'user' };
        localStorage.setItem('agrifert_token', token);
        setUser(userData);
        return { token, user: userData };
      }
      throw backendErr;
    }
  };

  const logout = () => {
    localStorage.removeItem('agrifert_token');
    delete API.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
