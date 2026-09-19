import { Navigate, Outlet, useLocation } from 'react-router';
import { isVerified, useAuth } from '../context/AuthContext.jsx';

// Guards a group of routes: signed in, and (with `verified`) identity-verified too.
export default function RequireAuth({ verified = false }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p role="status" className="text-muted">Loading your account…</p>;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (verified && !isVerified(user)) {
    return <Navigate to="/verify" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
