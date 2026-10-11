import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';

export default function ReferralCapture() {
  const { username } = useParams();

  useEffect(() => {
    if (username) localStorage.setItem('vnd_pending_ref', username);
  }, [username]);

  return <Navigate to="/login" replace />;
}
