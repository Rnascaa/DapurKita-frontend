import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function RequireUser() {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <main className="p-8 text-center">Memulihkan sesi…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}
