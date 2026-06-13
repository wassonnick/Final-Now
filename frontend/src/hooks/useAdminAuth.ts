import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_SESSION_KEY = 'societyflats_admin_session';
const ADMIN_TOKEN_KEY = 'societyflats_admin_token';


function sanitizeAdminToken(value: string) {
  return String(value || '').trim();
}

export type AdminSession = {
  email: string;
  name: string;
  role: 'admin';
  loggedInAt: string;
};

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(email: string, token?: string) {
  const cleanToken = sanitizeAdminToken(token || import.meta.env.VITE_ADMIN_API_TOKEN || '');
  const session: AdminSession = {
    email,
    name: email.split('@')[0] || 'Admin',
    role: 'admin',
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(ADMIN_TOKEN_KEY, cleanToken);
  return session;
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getAdminToken() {
  const envToken = sanitizeAdminToken(import.meta.env.VITE_ADMIN_API_TOKEN || '');

  if (envToken) {
    return envToken;
  }

  if (typeof window === 'undefined') return '';

  return sanitizeAdminToken(localStorage.getItem(ADMIN_TOKEN_KEY) || '');
}

export function useAdminAuth() {
  const navigate = useNavigate();
  const session = useMemo(() => getAdminSession(), []);

  const logout = () => {
    clearAdminSession();
    navigate('/admin/login');
  };

  return {
    session,
    isAuthenticated: Boolean(session),
    logout,
  };
}
