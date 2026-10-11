import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import LoadingScreen from './LoadingScreen.js';

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { me, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!me) return <Navigate to="/login" replace />;
  if (adminOnly && me.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
