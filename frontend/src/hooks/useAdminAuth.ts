import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_SESSION_KEY = 'societyflats_admin_session';

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

export function setAdminSession(email: string) {
  const session: AdminSession = {
    email,
    name: email.split('@')[0] || 'Admin',
    role: 'admin',
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
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
