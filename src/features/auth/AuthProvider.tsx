import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getSessionSnapshot, restoreSession, subscribeSession } from '../../api';

const AuthContext = createContext<ReturnType<typeof getSessionSnapshot> | null>(null);

export function AuthProvider() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      const from = `${location.pathname}${location.search}${location.hash}`;
      navigate('/login', { replace: true, state: { from } });
    };
    window.addEventListener('dapurkita:session-expired', onExpired);
    return () => window.removeEventListener('dapurkita:session-expired', onExpired);
  }, [location.hash, location.pathname, location.search, navigate]);

  const value = useMemo(() => session, [session]);
  if (!session.ready) return <main className="p-8 text-center">Memulihkan sesi…</main>;
  return <AuthContext.Provider value={value}><Outlet /></AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
}
