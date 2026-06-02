import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminI18n } from '../lib/i18n';

export default function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  const { t } = useAdminI18n();

  if (loading) {
    return <p className="card">{t('protected.loading')}</p>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
