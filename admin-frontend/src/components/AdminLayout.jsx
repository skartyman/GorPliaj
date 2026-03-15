import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  async function onLogout() {
    await apiRequest('/api/admin/auth/logout', { method: 'POST' }).catch(() => null);
    navigate('/admin/login');
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/admin/reservations" className="brand">
          GorPliaj Admin
        </Link>
        <button type="button" className="btn" onClick={onLogout}>
          Logout
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
