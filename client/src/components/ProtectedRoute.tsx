import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/auth';

function FullPageLoader() {
  return (
    <div className="center-screen" role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== role) {
    const home = user.role === 'admin' ? '/admin' : '/patient';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}