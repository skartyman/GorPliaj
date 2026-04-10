import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslations } from '../lib/i18n';
import { useMenu, useReservation } from '../hooks/useApi';

export default function HomePage() {
  const { t, currentLanguage, setLanguage } = useTranslations();
  const { menu } = useMenu();
  const { createReservation, submitting, error, success, reset } = useReservation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleLanguageToggle = () => {
    const newLang = currentLanguage === 'uk' ? 'en' : 'uk';
    setLanguage(newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    await createReservation(payload);
    if (!error) {
      e.target.reset();
    }
  };

  return (
    <div className="menu-page-body home-page-body">
      <main className="menu-page-shell home-page-shell">
        <section className="menu-page-surface home-page-surface">
          {/* Header */}
          <header className="menu-page-header home-page-header" id="top">
            <div className="home-page-header-bar">
              <a className="brand" href="#top">
                <span className="brand-mark">GP</span>
                <span>
                  <strong>ГорПляж</strong>
                  <small data-i18n="brandSubtitle">{t('brandSubtitle')}</small>
                </span>
              </a>
              <button
                id="languageToggle"
                className="lang-toggle home-header-action"
                type="button"
                aria-label="Switch language"
                onClick={handleLanguageToggle}
              >
                {currentLanguage === 'uk' ? 'EN' : 'UK'}
              </button>
            </div>

            <div className="home-page-scroll-block" aria-label="Site sections and controls">
              <nav className="home-page-scroll-track" aria-label="Site navigation">
                <a href="#about">{t('navAbout')}</a>
                <Link to="/menu">{t('navMenu')}</Link>
                <a href="#booking">{t('navBooking')}</a>
                <a href="#events">{t('navEvents')}</a>
                <a href="#news">{t('navNews')}</a>
                <a href="#contacts">{t('navContacts')}</a>
                {showInstall && (
                  <button id="installBtn" className="install-btn home-scroll-action" onClick={handleInstallClick}>
                    {t('installApp')}
                  </button>
                )}
              </nav>
            </div>
          </header>

          {/* Hero Section */}
          <section className="menu-page-intro home-hero-card">
            <p className="eyebrow">{t('heroEyebrow')}</p>
            <div className="home-hero-grid">
              <div className="home-hero-copy">
                <h1>{t('heroTitle')}</h1>
                <p className="menu-page-description home-hero-subtitle">{t('heroSubtitle')}</p>
                <p className="menu-page-description">{t('heroDescription')}</p>
                <div className="menu-preview-actions hero-actions">
                  <a className="btn btn-primary" href="#booking">{t('heroPrimaryCta')}</a>
                  <Link className="btn btn-secondary home-light-btn" to="/menu">{t('heroMenuCta')}</Link>
                  <Link className="btn btn-secondary home-light-btn" to="/booking">{t('heroSecondaryCta')}</Link>
                </div>
              </div>

              <aside className="home-highlight-panel">
                <article className="home-info-card scenic">
                  <p className="eyebrow">{t('heroPanelLabel')}</p>
                  <h2>{t('heroPanelTitle')}</h2>
                  <p className="menu-page-description">{t('heroPanelText')}</p>
                </article>

                <div className="hero-highlights home-highlight-stats">
                  <article className="highlight-card home-stat-card">
                    <span>{t('highlightMenu')}</span>
                    <strong id="heroMenuCount">{menu.length}</strong>
                  </article>
                  <article className="highlight-card home-stat-card">
                    <span>{t('highlightBookingAccess')}</span>
                    <strong>{t('highlightBookingAccessValue')}</strong>
                  </article>
                  <article className="highlight-card home-stat-card">
                    <span>{t('highlightZones')}</span>
                    <strong>4</strong>
                  </article>
                </div>
              </aside>
            </div>
          </section>

          {/* About Section */}
          <section className="home-grid home-grid-double home-section-divider" id="about">
            <article className="home-card home-card-wide">
              <p className="eyebrow">{t('aboutKicker')}</p>
              <h2>{t('aboutTitle')}</h2>
              <p className="menu-page-description">{t('aboutText')}</p>
            </article>

            <article className="home-card home-metric-stack">
              <div className="metric-card home-metric-card">
                <span>{t('metricSea')}</span>
                <strong>{t('metricSeaValue')}</strong>
              </div>
              <div className="metric-card home-metric-card">
                <span>{t('metricKitchen')}</span>
                <strong>{t('metricKitchenValue')}</strong>
              </div>
              <div className="metric-card home-metric-card">
                <span>{t('metricBooking')}</span>
                <strong>{t('metricBookingValue')}</strong>
              </div>
            </article>
          </section>

          {/* Menu Preview & Booking */}
          <section className="home-grid home-grid-double home-section-divider">
            <section className="home-card menu-preview-surface" id="menu-section">
              <div className="section-head section-head-compact">
                <div>
                  <p className="eyebrow">{t('menuKicker')}</p>
                  <h2>{t('menuTitle')}</h2>
                </div>
                <span className="section-chip" id="menuCountChip">{menu.length} {t('menuItemsCount')}</span>
              </div>
              <p className="menu-preview-copy">{t('menuPreviewText')}</p>
              <div className="menu-preview-actions">
                <Link className="btn btn-primary" to="/menu">{t('menuPreviewCta')}</Link>
                <a className="text-link" href="#booking">{t('menuPreviewSecondary')}</a>
              </div>
            </section>

            <section className="home-card booking-surface" id="booking">
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t('bookingKicker')}</p>
                  <h2>{t('bookingTitle')}</h2>
                </div>
                <Link className="text-link" to="/booking">{t('bookingMapCta')}</Link>
              </div>

              <div className="booking-grid home-booking-grid">
                <form id="reservationForm" className="booking-form" onSubmit={handleSubmit}>
                  <label>
                    <span>{t('guestName')}</span>
                    <input required name="guestName" type="text" />
                  </label>
                  <label>
                    <span>{t('phone')}</span>
                    <input required name="phone" type="tel" />
                  </label>
                  <div className="row">
                    <label>
                      <span>{t('date')}</span>
                      <input required name="date" type="date" />
                    </label>
                    <label>
                      <span>{t('time')}</span>
                      <input required name="time" type="time" />
                    </label>
                  </div>
                  <div className="row">
                    <label>
                      <span>{t('guests')}</span>
                      <input required min="1" max="20" name="guests" type="number" />
                    </label>
                    <label>
                      <span>{t('zone')}</span>
                      <select required name="zone" id="zoneSelect">
                        <option value="">{t('zoneSelect')}</option>
                        <option value="beach">{t('zoneBeach')}</option>
                        <option value="terrace">{t('zoneTerrace')}</option>
                        <option value="lounge">{t('zoneLounge')}</option>
                        <option value="hall">{t('zoneHall')}</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    <span>{t('note')}</span>
                    <textarea name="note" rows="3"></textarea>
                  </label>
                  
                  {error && <p id="reservationFormState" className="form-state is-error" role="alert">{t('reservationError')}</p>}
                  {success && <p id="reservationFormState" className="form-state is-success" role="status">{t('reservationSuccess')}</p>}
                  
                  <button type="submit" disabled={submitting}>{t('createReservation')}</button>
                </form>

                <div className="booking-aside">
                  <article className="aside-card home-card-muted">
                    <p className="eyebrow">{t('bookingAsideLabel')}</p>
                    <ul className="feature-list">
                      <li>{t('bookingFeature1')}</li>
                      <li>{t('bookingFeature2')}</li>
                      <li>{t('bookingFeature3')}</li>
                    </ul>
                  </article>
                  <article className="aside-card home-card-muted">
                    <p className="eyebrow">{t('bookingAsideSecondaryLabel')}</p>
                    <p className="menu-page-description">{t('bookingGraphicHint')}</p>
                  </article>
                </div>
              </div>
            </section>
          </section>

          {/* Events Section */}
          <section className="home-grid home-grid-triple home-section-divider" id="events">
            <article className="home-card news-item">
              <p className="eyebrow">{t('eventsKicker')}</p>
              <h2>{t('eventsTitle')}</h2>
              <p className="menu-page-description">{t('event1Text')}</p>
              <h3>{t('event1Title')}</h3>
            </article>
            <article className="home-card news-item">
              <h3>{t('event2Title')}</h3>
              <p className="menu-page-description">{t('event2Text')}</p>
            </article>
            <article className="home-card news-item">
              <h3>{t('event3Title')}</h3>
              <p className="menu-page-description">{t('event3Text')}</p>
            </article>
          </section>

          {/* News & Contacts */}
          <section className="home-grid home-grid-double home-section-divider" id="news">
            <article className="home-card">
              <p className="eyebrow">{t('newsKicker')}</p>
              <h2>{t('newsTitle')}</h2>
              <ul className="promo-list">
                <li>{t('promo1')}</li>
                <li>{t('promo2')}</li>
                <li>{t('promo3')}</li>
              </ul>
            </article>
            <article className="home-card" id="contacts">
              <p className="eyebrow">{t('contactsKicker')}</p>
              <h2>{t('contactsTitle')}</h2>
              <div className="contact-grid home-contact-grid">
                <article className="contact-card home-card-muted">
                  <span>{t('addressLabel')}</span>
                  <strong>{t('address')}</strong>
                </article>
                <article className="contact-card home-card-muted">
                  <span>{t('phoneLabel')}</span>
                  <strong>+380 99 000 00 00</strong>
                </article>
                <article className="contact-card home-card-muted">
                  <span>Email</span>
                  <strong>hello@gorpliaj.ua</strong>
                </article>
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  );
}
