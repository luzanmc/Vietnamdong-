import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-sm text-muted">Đang tải...</div>
      </div>
    );
  }

  if (!me) return <Navigate to="/login" replace />;
  if (adminOnly && me.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
