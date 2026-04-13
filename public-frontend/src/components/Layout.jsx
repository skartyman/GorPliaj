import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLocale } from '../state/locale';

const navItems = [
  { to: '/', labelKey: 'navHome', icon: (
    <svg viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z"/><path d="M9 22V12h6v10"/></svg>
  )},
  { to: '/events', labelKey: 'navEvents', icon: (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  )},
  { to: '/menu', labelKey: 'navMenu', icon: (
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l3 3 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  )},
  { to: '/booking', labelKey: 'navBooking', icon: (
    <svg viewBox="0 0 24 24"><path d="M12 20V10"/><path d="M18 8V6a6 6 0 0 0-12 0v2"/><rect x="3" y="20" width="18" height="2" rx="1"/></svg>
  )},
  { to: '/map', labelKey: 'navMap', icon: (
    <svg viewBox="0 0 24 24"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
  )},
  { to: '/about', labelKey: 'navAbout', icon: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
  )}
];

function BottomNavIcon({ path }) {
  const item = navItems.find(n => n.to === path);
  return item?.icon || null;
}

export default function Layout() {
  const location = useLocation();
  const { locale, setLocale, t } = useLocale();
  const isMenuRoute = location.pathname === '/menu';

  return (
    <div className={`app-shell${isMenuRoute ? ' menu-route' : ''}`}>
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <NavLink to="/" className="sidebar-logo">
          <img src="/icons/Logo.png" alt="GorPliaj" />
          <span className="sidebar-logo-text">GorPliaj</span>
        </NavLink>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{t(item.labelKey)}</span>
            </NavLink>
          ))}

          <div className="sidebar-divider" />

          <NavLink to="/service" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">
              <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </span>
            <span className="sidebar-label">{t('navService')}</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="locale-btn" onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}>
            {t('localeSwitch')}
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="top-bar">
        <NavLink to="/" className="top-bar-brand">
          <img src="/icons/Logo.png" alt="GorPliaj" />
          <span>GorPliaj</span>
        </NavLink>
        <button type="button" className="locale-btn" onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}>
          {t('localeSwitch')}
        </button>
      </header>

      {/* Main content */}
      <div className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <BottomNavIcon path={item.to} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <p>{t('footerText')}</p>
              <p style={{ marginTop: 8 }}>
                {locale === 'en'
                  ? 'A modern beach restaurant with live music, cuisine and evening events.'
                  : 'Современный ресторан у моря с живой музыкой, кухней и вечерними событиями.'}
              </p>
            </div>
            <div className="footer-contacts">
              <h3>{locale === 'en' ? 'Contacts' : 'Контакты'}</h3>
              <p>📞 <a href="tel:+380000000000">+38 (000) 000-00-00</a></p>
              <p>✉️ <a href="mailto:hello@gorpliaj.com">hello@gorpliaj.com</a></p>
              <p>📍 {locale === 'en' ? 'Otrada Beach, Odesa' : 'пляж Отрада, Одесса'}</p>
              <p>🕐 {locale === 'en' ? 'Daily 10:00 – 23:00' : 'Ежедневно 10:00 – 23:00'}</p>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'var(--brand)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, marginTop: 0 }}>
              {locale === 'en' ? 'How to find us' : 'Как найти заведение'}
            </h3>
            <div className="footer-bottom-map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2772.5!2d30.69!3d46.43!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDbCsDI1JzQ4LjAiTiAzMMKwNDEnMjQuMCJF!5e0!3m2!1sru!2sua!4v1"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="GorPliaj location"
              />
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} GorPliaj</span>
            <span>{locale === 'en' ? 'All rights reserved' : 'Все права защищены'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
