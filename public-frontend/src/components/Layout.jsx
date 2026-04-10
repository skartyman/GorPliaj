import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useLocale } from '../state/locale';

const links = [
  { to: '/', key: 'navHome' },
  { to: '/events', key: 'navEvents' },
  { to: '/menu', key: 'navMenu' },
  { to: '/booking', key: 'navBooking' },
  { to: '/map', key: 'navMap' },
  { to: '/about', key: 'navAbout' }
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { locale, setLocale, t } = useLocale();
  const isMenuRoute = location.pathname === '/menu';

  return (
    <div className={`app-shell${isMenuRoute ? ' menu-route' : ''}`}>
      <header className="site-header">
        <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src="/icons/Logo.png" alt="GorPliaj" />
          <span>GorPliaj</span>
        </NavLink>

        <div className="header-actions">
          <button type="button" className="locale-switch" onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}>
            {t('localeSwitch')}
          </button>
          <button type="button" className="burger-btn" onClick={() => setMenuOpen((value) => !value)}>
            {t('drawerMenu')}
          </button>
        </div>
      </header>

      <div className={`drawer-overlay ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`site-drawer ${menuOpen ? 'is-open' : ''}`}>
        <nav className="drawer-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
              {t(link.key)}
            </NavLink>
          ))}
          <NavLink to="/service" onClick={() => setMenuOpen(false)}>
            {t('navService')}
          </NavLink>
        </nav>
      </aside>

      <main className={`page-shell${isMenuRoute ? ' page-shell-menu' : ''}`}>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}>
            {t(link.key)}
          </NavLink>
        ))}
      </nav>

      <footer className="site-footer">{t('footerText')}</footer>
    </div>
  );
}
