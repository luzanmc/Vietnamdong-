import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import LoadingScreen from './LoadingScreen.js';

export default function GuestRoute() {
  const { me, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (me) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
