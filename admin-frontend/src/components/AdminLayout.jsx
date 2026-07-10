import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';

function IconDashboard() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function IconReservations() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>; }
function IconMapEditor() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function IconMap() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconMenu() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconEvents() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><rect x="7" y="7" width="3" height="3" rx="1"/><rect x="14" y="7" width="3" height="3" rx="1"/><rect x="7" y="14" width="3" height="3" rx="1"/><rect x="14" y="14" width="3" height="3" rx="1"/><line x1="7" y1="2" x2="7" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>; }
function IconNews() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>; }
function IconPayments() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><path d="M7 15h.01M11 15h2"/></svg>; }
function IconSettings() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
function IconUsers() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconTicket() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>; }
function IconTable() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="10" y1="10" x2="10" y2="16"/><line x1="14" y1="10" x2="14" y2="16"/></svg>; }
function IconTag() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IconHamburger() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function IconBack() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>; }
function IconChevronLeft() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function IconChevronRight() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function IconLogout() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconKey() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="14.5" r="5.5"/><path d="M12 10l8-8"/><path d="M16 6l2 2"/><path d="M18 4l2 2"/></svg>; }

const ALL_NAV_ITEMS = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: IconDashboard, roles: ['*'] },
  { to: '/admin/reservations', labelKey: 'nav.reservations', icon: IconReservations, roles: ['admin', 'hostess', 'manager', 'owner'] },
  { to: '/admin/map-editor', labelKey: 'nav.mapEditor', icon: IconMapEditor, roles: ['admin', 'manager', 'owner'] },
  { to: '/admin/map', labelKey: 'nav.map', icon: IconMap, roles: ['*'] },
  { to: '/admin/positions', labelKey: 'nav.positions', icon: IconTable, roles: ['admin', 'manager', 'owner'] },
  { to: '/admin/menu', labelKey: 'nav.menu', icon: IconMenu, roles: ['admin', 'manager', 'owner'] },
  { to: '/admin/events', labelKey: 'nav.events', icon: IconEvents, roles: ['seo_smm', 'admin', 'manager', 'owner'] },
  { to: '/admin/ticket-sales', labelKey: 'nav.ticketSales', icon: IconTicket, roles: ['seo_smm', 'admin', 'manager', 'owner'] },
  { to: '/admin/news', labelKey: 'nav.news', icon: IconNews, roles: ['seo_smm', 'admin', 'manager', 'owner'] },
  { to: '/admin/payments', labelKey: 'nav.payments', icon: IconPayments, roles: ['admin', 'manager', 'owner'] },
  { to: '/admin/verify-ticket', labelKey: 'nav.verifyTicket', icon: IconTicket, roles: ['hostess', 'admin', 'manager', 'owner'] },
  { to: '/admin/users', labelKey: 'nav.users', icon: IconUsers, roles: ['admin', 'manager', 'owner'] },
  { to: '/admin/waiters', labelKey: 'nav.waiters', icon: IconUsers, roles: ['admin', 'manager', 'owner'] },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: IconSettings, roles: ['seo_smm', 'admin', 'manager', 'owner'] }
];

function getNavItems(role) {
  if (role === 'manager' || role === 'owner') return ALL_NAV_ITEMS;
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes('*') || item.roles.includes(role));
}

function pageTitle(pathname, t) {
  const item = ALL_NAV_ITEMS.find((entry) => pathname.startsWith(entry.to));
  return item ? t(item.labelKey) : t('common.admin');
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [openSidebar, setOpenSidebar] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [passwordState, setPasswordState] = useState({ saving: false, error: '', success: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const path = window.location.pathname;
    return path.startsWith('/admin/map-editor') || path === '/admin/map';
  });
  const { t, toggleLanguage, language } = useAdminI18n();
  const diagRef2 = useRef({ pathname: '', tRef: null, userRef: null });
  const d2 = diagRef2.current;
  if (d2.pathname !== location.pathname) { console.warn('[DIAG] AdminLayout pathname changed', d2.pathname, '->', location.pathname); d2.pathname = location.pathname; }
  if (d2.tRef !== t) { console.warn('[DIAG] AdminLayout t REF changed'); d2.tRef = t; }
  const title = useMemo(() => pageTitle(location.pathname, t), [location.pathname, t]);
  const isMapFullscreen = location.pathname.startsWith('/admin/map-editor') || location.pathname === '/admin/map';
  const navItems = useMemo(() => getNavItems(user?.role), [user?.role]);

  useEffect(() => {
    if (isMapFullscreen) {
      setSidebarCollapsed(true);
      return;
    }

    if (window.innerWidth <= 960) {
      setSidebarCollapsed(false);
    }
  }, [isMapFullscreen, location.pathname]);

  useEffect(() => {
    if (openSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [openSidebar]);

  async function onLogout() {
    await apiRequest('/api/admin/auth/logout', { method: 'POST' }).catch(() => null);
    setUser(null);
    navigate('/admin/login');
  }

  function onBack() {
    if (window.history.length > 1 && location.pathname !== '/admin/dashboard') {
      navigate(-1);
      return;
    }

    navigate('/admin/dashboard');
  }

  function onNavSelect() {
    setOpenSidebar(false);
  }

  function openPasswordModal() {
    setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
    setPasswordState({ saving: false, error: '', success: '' });
    setPasswordModalOpen(true);
    setOpenSidebar(false);
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setPasswordState({ saving: true, error: '', success: '' });

    const { response, body } = await apiRequest('/api/admin/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(passwordForm)
    });

    if (!response.ok) {
      setPasswordState({
        saving: false,
        error: body.message || 'Не удалось изменить пароль.',
        success: ''
      });
      return;
    }

    setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
    setPasswordState({ saving: false, error: '', success: 'Пароль изменен.' });
  }

  return (
    <div className={`admin-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMapFullscreen ? 'map-editor-shell' : ''}`}>
      {openSidebar ? <div className="sidebar-overlay" onClick={() => setOpenSidebar(false)} /> : null}
      <aside className={`sidebar ${openSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/admin/dashboard" className="brand" onClick={onNavSelect}>
            <img src="/icons/Logo.png" alt="GorPliaj" className="brand-logo" />
            <span className="brand-text">{t('brand')}</span>
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onNavSelect}
              >
                <Icon />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="nav-link nav-action" onClick={openPasswordModal}>
            <IconKey />
            <span>{language === 'ua' ? 'Змінити пароль' : 'Изменить пароль'}</span>
          </button>
        </div>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn mobile-only" onClick={() => setOpenSidebar((prev) => !prev)} aria-label="Toggle menu">
              <IconHamburger />
            </button>
            <button type="button" className="icon-btn admin-back-btn" onClick={onBack} aria-label="Назад" title="Назад">
              <IconBack />
            </button>
            <button
              type="button"
              className="icon-btn desktop-sidebar-toggle"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? t('common.showSidebar') : t('common.hideSidebar')}
              title={sidebarCollapsed ? t('common.showSidebar') : t('common.hideSidebar')}
            >
              {sidebarCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
            </button>
            <h1>{title}</h1>
          </div>
          <div className="topbar-right">
            <span className="topbar-role">{user?.role ? t(`roles.${user.role}`) : ''}</span>
            <button type="button" className="btn btn-logout" onClick={onLogout} aria-label={t('common.logout')} title={t('common.logout')}>
              <IconLogout />
              <span className="btn-logout-label">{t('common.logout')}</span>
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      {passwordModalOpen ? (
        <div className="admin-modal-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !passwordState.saving) setPasswordModalOpen(false);
        }}>
          <form className="admin-modal-card password-modal-card" onSubmit={submitPasswordChange}>
            <div className="admin-modal-head">
              <div>
                <h2>{language === 'ua' ? 'Змінити пароль' : 'Изменить пароль'}</h2>
                <p className="muted">{language === 'ua' ? 'Акаунт' : 'Аккаунт'}: {user?.email}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPasswordModalOpen(false)} disabled={passwordState.saving} aria-label={language === 'ua' ? 'Закрити' : 'Закрыть'}>
                ×
              </button>
            </div>
            <label className="form-field">
              <span>{language === 'ua' ? 'Поточний пароль' : 'Текущий пароль'}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span>{language === 'ua' ? 'Новий пароль' : 'Новый пароль'}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwordForm.nextPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span>{language === 'ua' ? 'Повторіть новий пароль' : 'Повторите новый пароль'}</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </label>
            {passwordState.error ? <p className="state-msg state-error">{passwordState.error}</p> : null}
            {passwordState.success ? <p className="state-msg state-success">{passwordState.success}</p> : null}
            <div className="admin-modal-actions">
              <button type="button" className="btn" onClick={() => setPasswordModalOpen(false)} disabled={passwordState.saving}>{language === 'ua' ? 'Скасувати' : 'Отмена'}</button>
              <button type="submit" className="btn btn-primary" disabled={passwordState.saving}>
                {passwordState.saving ? (language === 'ua' ? 'Збереження...' : 'Сохраняем...') : (language === 'ua' ? 'Зберегти пароль' : 'Сохранить пароль')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
