import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';
import { localizedCopy, localizeField } from '../lib/i18n';

const navItems = [
  { to: '/', labelKey: 'navHome', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { to: '/events', labelKey: 'navEvents', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { to: '/menu', labelKey: 'navMenu', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="18.71 20.63 5.29 20.63 3.38 16.79 20.63 16.79"/>
      <line x1="0.5" y1="16.79" x2="23.5" y2="16.79"/>
      <path d="M12 6.25a9.58 9.58 0 0 1 9.58 9.58v0.96H2.42v-0.96A9.58 9.58 0 0 1 12 6.25Z"/>
      <line x1="12" y1="3.37" x2="12" y2="6.25"/>
      <line x1="10.08" y1="3.38" x2="13.92" y2="3.38"/>
    </svg>
  )},
  { to: '/map-preview', labelKey: 'navMap', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )},
  { to: '/booking', labelKey: 'navBooking', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z"/>
      <polyline points="8 10 12 14 16 10"/>
      <line x1="12" y1="2" x2="12" y2="6"/>
    </svg>
  )},
  { to: '/about', labelKey: 'navAbout', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
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
  const item = navItems.find((entry) => entry.to === path);
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  const brandName = localizeField(settings?.title, locale) || 'GorPliaj';
  const logoUrl = settings?.logoUrl || '/icons/Logo.png';
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
  const rulesLinkText = localizedCopy({ ua: 'Правила перебування', ru: 'Правила пребывания', en: 'Venue Rules' }, locale);
  const privacyLinkText = localizedCopy({ ua: 'Політика конфіденційності', ru: 'Политика конфиденциальности', en: 'Privacy Policy' }, locale);
  const paymentReturnsLinkText = localizedCopy({ ua: 'Умови оплати і повернення', ru: 'Условия оплаты и возврата', en: 'Payment and Refund Terms' }, locale);
  const menuServiceNotice = localizedCopy({
    ua: 'Звертаємо увагу, що до кінцевого рахунку за меню буде додано 10% за обслуговування гостя.',
    ru: 'Обращаем внимание, что к итоговому счету за меню будет добавлено 10% за обслуживание гостя.',
    en: 'Please note that a 10% guest service charge will be added to the final menu bill.'
  }, locale);
  const workingHoursText = settings?.workingHours?.mon?.open
    ? localizedCopy({
        ua: `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Нд ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`,
        ru: `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Вс ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`,
        en: `Mon-Thu ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Fri-Sun ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`
      }, locale)
    : localizedCopy({ ua: 'Щодня 09:00-21:00', ru: 'Ежедневно 09:00-21:00', en: 'Daily 09:00-21:00' }, locale);

  return (
    <div className={`app-shell${isMenuRoute ? ' menu-route' : ''}`}>
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
          <button
            type="button"
            className="locale-btn"
            onClick={() => {
              const order = ['ua', 'ru', 'en'];
              const next = order[(order.indexOf(locale) + 1) % order.length];
              setLocale(next);
            }}
          >
            {locale.toUpperCase()}
          </button>
          <button
            type="button"
            className="locale-btn"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            style={{ marginTop: 4 }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </aside>

      <header className={`top-bar${isMenuRoute ? ' menu-top-bar' : ''}`}>
        <NavLink to="/" className="top-bar-brand">
          <img className="top-bar-logo" src={logoUrl} alt={brandName} />
          <span>{brandName}</span>
        </NavLink>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="locale-btn"
            onClick={() => {
              const order = ['ua', 'ru', 'en'];
              const next = order[(order.indexOf(locale) + 1) % order.length];
              setLocale(next);
            }}
          >
            {locale.toUpperCase()}
          </button>
          <button type="button" className="locale-btn" onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </div>

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

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--brand)' }}>{brandName}</p>
              <p style={{ marginTop: 8 }}>{footerDescription}</p>
              {socialLinks.length > 0 && (
                <div className="footer-socials" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  {socialLinks.map((social, idx) => {
                    const isInstagram = social.platform === 'instagram';
                    const handle = isInstagram ? social.url.replace(/\/$/, '').split('/').pop() : null;
                    const iconClass = SOCIAL_ICONS[social.platform.toLowerCase()] || SOCIAL_ICONS.default;

                    return (
                      <a key={idx} href={social.url} target="_blank" rel="noopener noreferrer" className="social-link" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`fab ${iconClass}`} style={{ fontSize: '1.2rem' }} />
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
                src={settings?.mapEmbedUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2772.5!2d30.69!3d46.43!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDbCsDI1JzQ4LjAiTiAzMMKwNDEnMjQuMCJF!5e0!3m2!1sru!2sua!4v1'}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="GorPliaj location"
              />
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-legal-links">
              <span>© {new Date().getFullYear()} {brandName}</span>
              <NavLink to="/rules">{rulesLinkText}</NavLink>
              <NavLink to="/privacy">{privacyLinkText}</NavLink>
              <NavLink to="/payment-returns">{paymentReturnsLinkText}</NavLink>
              <span className="footer-legal-note">{menuServiceNotice}</span>
            </div>
            <span>{rightsText}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
