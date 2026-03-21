import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, isAuthed: false });
  const { t } = useAdminI18n();

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
    return <p className="card">{t('protected.loading')}</p>;
  }

  if (!state.isAuthed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
