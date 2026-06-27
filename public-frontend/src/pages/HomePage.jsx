import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { contentApi, eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';
import { localizedCopy, localizeField } from '../lib/i18n';
import GalleryCarousel from '../components/GalleryCarousel';
import WeatherBlock from '../components/WeatherBlock';
import EventCard from '../components/EventCard';

const fallbackMenuPhotos = ['/icons/piano.jpg', '/icons/moonpirs.jpg', '/icons/zakat.jpg', '/icons/photo_2026-03-22_18-51-11.jpg', '/icons/photo_2026-03-22_18-51-20.jpg'];

export default function HomePage() {
  const { t, locale } = useLocale();
  const { settings } = useSettings();
  const [state, setState] = useState({ events: [], menuPreviewImages: [] });
  useMeta(t('homeMetaTitle'), t('homeMetaDescription'));

  useEffect(() => {
    async function load() {
      const [events, menu] = await Promise.allSettled([eventsApi.list(false), contentApi.menu()]);

      setState({
        events: events.status === 'fulfilled' ? events.value.slice(0, 8) : [],
        menuPreviewImages:
          menu.status === 'fulfilled'
            ? menu.value.flatMap((category) => (Array.isArray(category?.items) ? category.items.map((item) => item?.imageUrl).filter(Boolean) : [])).slice(0, 8)
            : []
      });
    }

    load().catch(() => {});
  }, []);

  const menuPhotos = state.menuPreviewImages.length ? state.menuPreviewImages : fallbackMenuPhotos;
  const c = (values) => localizedCopy(values, locale);

  const isEn = locale === 'en';
  const heroTitle = localizeField(settings?.heroTitle, locale) || 'GorPliaj';
  const heroSubtitle = localizeField(settings?.heroSubtitle, locale) || c({
    ua: 'Пляжно-ресторанний простір із живою музикою, кухнею та вечірніми подіями на пляжі Відрада, Одеса',
    ru: 'Пляжно-ресторанное пространство с живой музыкой, кухней и вечерними событиями на пляже Отрада, Одесса',
    en: 'Beach restaurant with live music, cuisine and evening events at Otrada Beach, Odesa'
  });
  const addressText = localizeField(settings?.address, locale) || c({ ua: 'пляж Відрада, Одеса', ru: 'пляж Отрада, Одесса', en: 'Otrada Beach, Odesa' });
  const socialLinks = (settings?.socialMedia || []).filter((social) => social?.url && social?.platform);
  const workingHoursText = settings?.workingHours?.mon?.open
    ? c({
        ua: `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Нд ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`,
        ru: `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Вс ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`,
        en: `Mon-Thu ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Fri-Sun ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`
      })
    : c({ ua: 'Щодня 09:00-21:00', ru: 'Ежедневно 09:00-21:00', en: 'Daily 09:00-21:00' });

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
          <div className="btn-group">
            <Link to="/booking" className="btn btn-primary">{c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}</Link>
            <Link to="/menu" className="btn btn-secondary">{c({ ua: 'Переглянути меню', ru: 'Открыть меню', en: 'View menu' })}</Link>
          </div>
        </div>
      </section>

      {/* Services Prices & Events */}
      <section className="content-section promo-grid-section">
        <div className="promo-grid">
          <div className="promo-prices-card">
            <div className="section-header">
              <h2>{c({ ua: 'Вартість послуг', ru: 'Стоимость услуг', en: 'Service Prices' })}</h2>
            </div>
            <div className="promo-prices-container">
              <img src="/icons/public-map.png" alt={c({ ua: 'Вартість послуг', ru: 'Стоимость услуг', en: 'Service Prices' })} className="promo-prices-image" loading="lazy" />
            </div>
          </div>
          <div className="promo-events-card">
            <div className="section-header">
              <h2>{c({ ua: 'Афіша', ru: 'Афиша', en: 'Events' })}</h2>
              <Link to="/events" className="text-link">{c({ ua: 'Усі події', ru: 'Все события', en: 'All events' })} →</Link>
            </div>
            <div className="events-grid promo-events-grid">
              {state.events.length ? (
                state.events.slice(0, 1).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                <div className="state-msg">{c({ ua: 'Нові події скоро зʼявляться', ru: 'Новые события скоро появятся', en: 'New events coming soon' })}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section className="content-section">
        <div className="section-header">
          <h2>{c({ ua: 'Меню', ru: 'Меню', en: 'Menu' })}</h2>
          <Link to="/menu" className="text-link">{c({ ua: 'Повне меню', ru: 'Открыть меню', en: 'Full menu' })} →</Link>
        </div>
        <div className="gallery-scroll">
          {menuPhotos.map((photo) => (
            <div key={photo} className="gallery-item">
              <Link to="/menu" style={{ display: 'block' }}>
                <img src={photo} alt={c({ ua: 'Позиція меню', ru: 'Позиция меню', en: 'Menu item' })} loading="lazy" style={{ cursor: 'pointer' }} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Booking CTA */}
      <section className="content-section">
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '32px 24px' }}>
          <h2 style={{ marginBottom: 16, textAlign: 'center' }}>
            {c({ ua: 'Що бажаєте забронювати?', ru: 'Что хотите забронировать?', en: 'What would you like to book?' })}
          </h2>
          <div className="booking-kind-grid" style={{ marginTop: 24 }}>
            {[
              {
                value: 'TABLE',
                icon: '/icons/booking-table.png',
                copy: {
                  ua: { title: 'Стіл', body: 'Ресторан, тераса, пірс та вечірні посадки.' },
                  ru: { title: 'Стол', body: 'Ресторан, терраса, пирс и вечерние посадки.' },
                  en: { title: 'Table', body: 'Restaurant, terrace, pier, and evening seating.' }
                }
              },
              {
                value: 'BEACH',
                icon: '/icons/booking-beach.png',
                copy: {
                  ua: { title: 'Пляж', body: 'Бунгало, ліжка та інші пляжні послуги.' },
                  ru: { title: 'Пляж', body: 'Бунгало, кровати и другие пляжные услуги.' },
                  en: { title: 'Beach', body: 'Bungalows, daybeds, and other beach services.' }
                }
              }
            ].map((option) => {
              const localized = option.copy[locale === 'ua' ? 'ua' : locale === 'ru' ? 'ru' : 'en'] || option.copy['en'];
              return (
                <Link
                  key={option.value}
                  to={`/booking?kind=${option.value}`}
                  className={`booking-kind-card booking-kind-card-${option.value.toLowerCase()}`}
                  style={{ textDecoration: 'none', color: 'inherit', textAlign: 'left' }}
                >
                  <div className="booking-kind-icon">
                    <img src={option.icon} alt={option.value} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: 6 }}>{localized.title}</strong>
                  <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>{localized.body}</span>
                  <VisualSchedule bookingKind={option.value} locale={locale} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {settings?.galleryImages?.length > 0 ? (
        <section className="content-section">
          <div className="section-header">
            <h2>{c({ ua: 'Галерея', ru: 'Галерея', en: 'Gallery' })}</h2>
          </div>
          <GalleryCarousel images={settings.galleryImages} />
        </section>
      ) : null}

      <WeatherBlock />

      {/* About / Info */}
      <section className="content-section">
        <div className="info-grid">
          <div className="info-block">
            <h3>{c({ ua: 'Локація', ru: 'Локация', en: 'Location' })}</h3>
            <p>{addressText}</p>
            <p>{workingHoursText}</p>
          </div>
          <div className="info-block">
            <h3>{c({ ua: 'Контакти', ru: 'Контакты', en: 'Contacts' })}</h3>
            <p><a href={`tel:${settings?.phone || '+380000000000'}`}>{settings?.phone || '+38 (000) 000-00-00'}</a></p>
            {socialLinks.length > 0 && (
              <div className="info-socials" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {socialLinks.map((social, idx) => {
                  const isInstagram = social.platform === 'instagram';
                  // Извлекаем логин из ссылки инстаграма
                  const handle = isInstagram ? social.url.replace(/\/$/, '').split('/').pop() : null;
                  
                  return (
                    <a key={idx} href={social.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className={`fab fa-${social.platform === 'telegram' ? 'telegram-plane' : social.platform}`} style={{ fontSize: '1.2rem' }}></i>
                      {isInstagram && <span style={{ fontSize: '1rem', fontWeight: 500 }}>@{handle}</span>}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <div className="info-block">
            <h3>{c({ ua: 'Онлайн', ru: 'Онлайн', en: 'Online' })}</h3>
            <p><Link to="/events">{c({ ua: 'Афіша подій', ru: 'Афиша событий', en: 'Events schedule' })}</Link></p>
            <p><Link to="/menu">{c({ ua: 'Публічне меню', ru: 'Публичное меню', en: 'Public menu' })}</Link></p>
          </div>
        </div>
      </section>
    </>
  );
}

function VisualSchedule({ bookingKind, locale }) {
  const isBeach = bookingKind === 'BEACH';
  const startHour = 8;
  const endHour = 22;
  const totalHours = endHour - startHour; // 14

  const activeStart = 9;
  const tableWidthPercent = ((20 - 9) / totalHours) * 100;
  const beachArrivalWidthPercent = ((13 - 9) / totalHours) * 100;
  const beachLeisureWidthPercent = ((20 - 9) / totalHours) * 100;

  const leftPercent = ((activeStart - startHour) / totalHours) * 100;

  const label = isBeach
    ? {
        ua: 'Пляж: бронь на весь день (обовʼязкова явка 09:00 - 13:00)',
        ru: 'Пляж: бронь на весь день (обязательная явка 09:00 - 13:00)',
        en: 'Beach: full day booking (mandatory arrival 09:00 - 13:00)'
      }
    : {
        ua: 'Столи: час бронювання 09:00 - 20:00',
        ru: 'Столы: время бронирования 09:00 - 20:00',
        en: 'Tables: booking hours 09:00 - 20:00'
      };

  const getCopy = (dict) => dict[locale === 'ua' ? 'ua' : locale === 'ru' ? 'ru' : 'en'] || dict['en'];

  return (
    <div className={`visual-schedule${isBeach ? ' is-beach' : ' is-table'}`}>
      <div className="visual-schedule-title">
        {getCopy(label)}
      </div>

      <div className="visual-schedule-track" aria-hidden="true">
        {isBeach ? (
          <>
            <div
              className="visual-schedule-segment visual-schedule-segment-rest"
              style={{
              left: `${leftPercent}%`,
              width: `${beachLeisureWidthPercent}%`
            }}
              title={getCopy({ ua: 'Час відпочинку', ru: 'Время отдыха', en: 'Leisure time' })}
            />
            <div
              className="visual-schedule-segment visual-schedule-segment-arrival"
              style={{
              left: `${leftPercent}%`,
              width: `${beachArrivalWidthPercent}%`
            }}
              title={getCopy({ ua: 'Обовʼязкова явка', ru: 'Обязательная явка', en: 'Mandatory arrival' })}
            />
          </>
        ) : (
          <div
            className="visual-schedule-segment visual-schedule-segment-table"
            style={{
            left: `${leftPercent}%`,
            width: `${tableWidthPercent}%`
          }}
          />
        )}
      </div>

      <div className="visual-schedule-marks">
        <span
          className={`visual-schedule-mark is-active-start${isBeach ? ' is-strong' : ''}`}
          style={{ left: `${((9 - startHour) / totalHours) * 100}%` }}
        >
          09:00
        </span>
        {isBeach && (
          <span
            className="visual-schedule-mark is-strong"
            style={{ left: `${((13 - startHour) / totalHours) * 100}%` }}
          >
            13:00
          </span>
        )}
        <span
          className="visual-schedule-mark is-end"
          style={{ left: `${((20 - startHour) / totalHours) * 100}%` }}
        >
          20:00
        </span>
      </div>

      <div className="visual-schedule-legend">
        {isBeach ? (
          <>
            <span>
              <i className="visual-schedule-dot" aria-hidden="true" />
              {getCopy({ ua: 'Реєстрація (явка)', ru: 'Регистрация (явка)', en: 'Mandatory Check-in' })}
            </span>
            <span>
              <i className="visual-schedule-dot is-muted" aria-hidden="true" />
              {getCopy({ ua: 'Час відпочинку (бронь діє)', ru: 'Время отдыха (бронь действует)', en: 'Rest Time (booking active)' })}
            </span>
          </>
        ) : (
          <span>
            <i className="visual-schedule-dot is-table" aria-hidden="true" />
            {getCopy({ ua: 'Час бронювання', ru: 'Время бронирования', en: 'Booking time' })}
          </span>
        )}
      </div>
    </div>
  );
}
