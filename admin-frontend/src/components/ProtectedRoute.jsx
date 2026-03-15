import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, isAuthed: false });

  useEffect(() => {
    let active = true;

    apiRequest('/api/admin/auth/me')
      .then(({ response }) => {
        if (!active) {
          return;
        }

        setState({ loading: false, isAuthed: response.ok });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setState({ loading: false, isAuthed: false });
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (state.loading) {
    return <p className="card">Loading...</p>;
  }

  if (!state.isAuthed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
