import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';
import { localizedCopy, localizeField } from '../lib/i18n';

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
  { to: '/about', labelKey: 'navAbout', icon: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
  )}
];

const SOCIAL_ICONS = {
  instagram: 'fa-instagram',
  facebook: 'fa-facebook-f',
  twitter: 'fa-twitter',
  tiktok: 'fa-tiktok',
  youtube: 'fa-youtube',
  telegram: 'fa-telegram-plane',
  whatsapp: 'fa-whatsapp',
  default: 'fa-share-alt'
};

function BottomNavIcon({ path }) {
  const item = navItems.find(n => n.to === path);
  return item?.icon || null;
}

export default function Layout() {
  const location = useLocation();
  const { locale, setLocale, t } = useLocale();
  const { settings } = useSettings();
  const isMenuRoute = location.pathname === '/menu';
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const brandName = localizeField(settings?.title, locale) || 'GorPliaj';
  const logoUrl = settings?.logoUrl || '/icons/Logo.png';
  const isEn = locale === 'en';
  const footerDescription = localizeField(settings?.footerText, locale) || localizedCopy({
    ua: 'Сучасний ресторан біля моря з живою музикою, кухнею та вечірніми подіями.',
    ru: 'Современный ресторан у моря с живой музыкой, кухней и вечерними событиями.',
    en: 'A modern beach restaurant with live music, cuisine and evening events.'
  }, locale);
  const addressText = localizeField(settings?.address, locale) || localizedCopy({
    ua: 'пляж Відрада, Одеса',
    ru: 'пляж Отрада, Одесса',
    en: 'Otrada Beach, Odesa'
  }, locale);
  const socialLinks = (settings?.socialMedia || []).filter((social) => social?.url && social?.platform);
  const contactsTitle = localizedCopy({ ua: 'Контакти', ru: 'Контакты', en: 'Contacts' }, locale);
  const findUsTitle = localizedCopy({ ua: 'Як знайти заклад', ru: 'Как найти заведение', en: 'How to find us' }, locale);
  const rightsText = localizedCopy({ ua: 'Усі права захищені', ru: 'Все права защищены', en: 'All rights reserved' }, locale);
  const workingHoursText = settings?.workingHours?.mon?.open
    ? localizedCopy({
        ua: `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Нд ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`,
        ru: `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Вс ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`,
        en: `Mon-Thu ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Fri-Sun ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`
      }, locale)
    : localizedCopy({ ua: 'Щодня 09:00-21:00', ru: 'Ежедневно 09:00-21:00', en: 'Daily 09:00-21:00' }, locale);

  return (
    <div className={`app-shell${isMenuRoute ? ' menu-route' : ''}`}>
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <NavLink to="/" className="sidebar-logo">
          <img src={logoUrl} alt={brandName} />
          <span className="sidebar-logo-text">{brandName}</span>
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
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="locale-btn" onClick={() => {
            const order = ['ua', 'ru', 'en'];
            const next = order[(order.indexOf(locale) + 1) % order.length];
            setLocale(next);
          }}>
            {locale.toUpperCase()}
          </button>
          <button
            type="button"
            className="locale-btn"
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            style={{ marginTop: 4 }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className={`top-bar${isMenuRoute ? ' menu-top-bar' : ''}`}>
        <NavLink to="/" className="top-bar-brand">
          <img className="top-bar-logo" src={logoUrl} alt={brandName} />
          <span>{brandName}</span>
        </NavLink>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="locale-btn" onClick={() => {
            const order = ['ua', 'ru', 'en'];
            const next = order[(order.indexOf(locale) + 1) % order.length];
            setLocale(next);
          }}>
            {locale.toUpperCase()}
          </button>
          <button type="button" className="locale-btn" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
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
              <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand)' }}>{brandName}</p>
              <p style={{ marginTop: 8 }}>
                {footerDescription}
              </p>
              {socialLinks.length > 0 && (
                <div className="footer-socials" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  {socialLinks.map((social, idx) => {
                    const isInstagram = social.platform === 'instagram';
                    const handle = isInstagram ? social.url.replace(/\/$/, '').split('/').pop() : null;
                    const iconClass = SOCIAL_ICONS[social.platform.toLowerCase()] || SOCIAL_ICONS.default;
                    
                    return (
                      <a key={idx} href={social.url} target="_blank" rel="noopener noreferrer" className="social-link" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`fab ${iconClass}`} style={{ fontSize: '1.2rem' }}></i>
                        {isInstagram && <span style={{ fontSize: '0.9rem' }}>@{handle}</span>}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="footer-contacts">
              <h3>{contactsTitle}</h3>
              <p>📞 <a href={`tel:${settings?.phone || '+380000000000'}`}>{settings?.phone || '+38 (000) 000-00-00'}</a></p>
              <p>📍 {addressText}</p>
              <p>🕐 {workingHoursText}</p>
            </div>
          </div>

          <div>
            <h3 style={{ color: 'var(--brand)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, marginTop: 0 }}>
              {findUsTitle}
            </h3>
            <div className="footer-bottom-map">
              <iframe
                src={settings?.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2772.5!2d30.69!3d46.43!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDbCsDI1JzQ4LjAiTiAzMMKwNDEnMjQuMCJF!5e0!3m2!1sru!2sua!4v1"}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="GorPliaj location"
              />
            </div>
          </div>

          <div className="footer-bottom">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>© {new Date().getFullYear()} {brandName}</span>
              <NavLink to="/privacy" style={{ color: 'inherit', fontSize: '0.8rem', opacity: 0.8 }}>{t('privacyTitle')}</NavLink>
            </div>
            <span>{rightsText}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
