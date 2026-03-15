import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/reservations', label: 'Reservations' },
  { to: '/admin/map', label: 'Venue map' },
  { to: '/admin/menu', label: 'Menu' },
  { to: '/admin/events', label: 'Events / Posters' },
  { to: '/admin/news', label: 'News' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/settings', label: 'Settings' }
];

function pageTitle(pathname) {
  const item = navItems.find((entry) => pathname.startsWith(entry.to));
  return item?.label || 'Admin';
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSidebar, setOpenSidebar] = useState(false);
  const title = useMemo(() => pageTitle(location.pathname), [location.pathname]);

  async function onLogout() {
    await apiRequest('/api/admin/auth/logout', { method: 'POST' }).catch(() => null);
    navigate('/admin/login');
  }

  function onNavSelect() {
    setOpenSidebar(false);
  }

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${openSidebar ? 'open' : ''}`}>
        <Link to="/admin/dashboard" className="brand" onClick={onNavSelect}>
          GorPliaj Admin
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavSelect}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn mobile-only" onClick={() => setOpenSidebar((prev) => !prev)}>
              ☰
            </button>
            <h1>{title}</h1>
          </div>
          <button type="button" className="btn" onClick={onLogout}>
            Logout
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
