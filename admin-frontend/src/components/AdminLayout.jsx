import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const navItems = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard' },
  { to: '/admin/reservations', labelKey: 'nav.reservations' },
  { to: '/admin/map-editor', labelKey: 'nav.mapEditor' },
  { to: '/admin/map', labelKey: 'nav.map' },
  { to: '/admin/booking-runtime', labelKey: 'nav.map' },
  { to: '/admin/menu', labelKey: 'nav.menu' },
  { to: '/admin/events', labelKey: 'nav.events' },
  { to: '/admin/news', labelKey: 'nav.news' },
  { to: '/admin/payments', labelKey: 'nav.payments' },
  { to: '/admin/settings', labelKey: 'nav.settings' }
];

function pageTitle(pathname, t) {
  const item = navItems.find((entry) => pathname.startsWith(entry.to));
  return item ? t(item.labelKey) : t('common.admin');
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSidebar, setOpenSidebar] = useState(false);
  const { t, toggleLanguage } = useAdminI18n();
  const title = useMemo(() => pageTitle(location.pathname, t), [location.pathname, t]);

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
        <div className="sidebar-header">
          <Link to="/admin/dashboard" className="brand" onClick={onNavSelect}>
            {t('brand')}
          </Link>
          <button
            type="button"
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            aria-label={t('common.languageAria')}
          >
            {t('common.languageSwitch')}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavSelect}
            >
              {t(item.labelKey)}
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
            {t('common.logout')}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
