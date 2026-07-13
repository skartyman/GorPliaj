import { Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { contentApi, eventsApi, mapApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';
import { localizedCopy, localizeField } from '../lib/i18n';
import GalleryCarousel from '../components/GalleryCarousel';
import WeatherBlock from '../components/WeatherBlock';
import EventCard from '../components/EventCard';
import MapPreview from '../components/MapPreview';

export default function HomePage() {
  const { t, locale } = useLocale();
  const { settings } = useSettings();
  const [state, setState] = useState({ events: [], menuPreviewImages: [] });
  const [mapPreview, setMapPreview] = useState({ loading: true, error: false, map: null, objects: [], zones: [], units: [], date: '', timeFrom: '', isTomorrow: false });
  const sectionsRef = useRef([]);
  useMeta(t('homeMetaTitle'), t('homeMetaDescription'));

  const addSectionRef = useCallback((el) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  }, []);

  useEffect(() => {
    const sections = sectionsRef.current.filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [state]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadMapPreview() {
      const now = new Date();
      const previewDate = new Date(now);
      const weekDay = now.getDay();
      const schedule = weekDay === 0 || weekDay >= 5
        ? settings?.workingHours?.fri
        : settings?.workingHours?.mon;
      const parseMinutes = (value, fallback) => {
        const [hours, minutes] = String(value || fallback).split(':').map(Number);
        return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
      };
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = parseMinutes(schedule?.open, '09:00');
      const closeMinutes = parseMinutes(schedule?.close, weekDay === 0 || weekDay >= 5 ? '22:00' : '21:00');
      const isTomorrow = currentMinutes >= closeMinutes;
      if (isTomorrow) previewDate.setDate(previewDate.getDate() + 1);
      const year = previewDate.getFullYear();
      const month = String(previewDate.getMonth() + 1).padStart(2, '0');
      const day = String(previewDate.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      const previewMinutes = isTomorrow ? openMinutes : Math.min(Math.max(currentMinutes, openMinutes), closeMinutes);
      const timeFrom = `${String(Math.floor(previewMinutes / 60)).padStart(2, '0')}:${String(previewMinutes % 60).padStart(2, '0')}`;
      const mapsResult = await mapApi.list({ usageMode: 'DAY', guests: 2 });
      const maps = Array.isArray(mapsResult?.maps) ? mapsResult.maps : [];
      const preferred = maps.find((item) => item.isDefault) || maps[0];
      if (!preferred) return;

      const [mapResult, unitsResult] = await Promise.all([
        mapApi.byId(preferred.id),
        mapApi.bookableUnits(preferred.id, { date, timeFrom, guests: 2 })
      ]);

      if (cancelled) return;
      setMapPreview({
        loading: false,
        error: false,
        map: mapResult?.map || unitsResult?.map || preferred || null,
        objects: Array.isArray(mapResult?.objects) ? mapResult.objects : [],
        zones: Array.isArray(mapResult?.zones) ? mapResult.zones : [],
        units: Array.isArray(unitsResult?.units) ? unitsResult.units : [],
        date,
        timeFrom,
        isTomorrow
      });
    }

    loadMapPreview().catch(() => {
      if (!cancelled) {
        setMapPreview((current) => ({ ...current, loading: false, error: true }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settings?.workingHours]);

  const menuPhotos = state.menuPreviewImages;
  const c = (values) => localizedCopy(values, locale);
  const mapOccupancy = (() => {
    const units = Array.isArray(mapPreview.units) ? mapPreview.units : [];
    const free = units.filter((unit) => unit.status === 'free').length;
    const held = units.filter((unit) => unit.status === 'held').length;
    const busy = units.filter((unit) => unit.status === 'busy').length;
    const unavailable = units.filter((unit) => unit.status === 'unavailable').length;
    return { total: units.length, free, held, busy, unavailable };
  })();
  const openBookingMap = (unit) => {
    const params = new URLSearchParams({
      date: mapPreview.date,
      timeFrom: mapPreview.timeFrom,
      guests: '2',
      usageMode: 'DAY',
      mapId: String(mapPreview.map?.id || '')
    });
    if (unit?.bookingKind) params.set('kind', unit.bookingKind);
    if (unit?.tableId) params.set('tableId', String(unit.tableId));
    window.location.href = `/booking?${params.toString()}`;
  };

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
      {/* Fullscreen sea video background */}
      <video className="sea-video-bg" autoPlay muted loop playsInline preload="auto">
        <source src="https://pub-6d1f04082d9e4584a48596bdac463b42.r2.dev/videos/sea-loop.mp4" type="video/mp4" />
      </video>
      <div className="sea-video-overlay" />

      {/* Hero: text + buttons over the wave */}
      <section className="hero">
        <h1>{heroTitle}</h1>
        <p>{heroSubtitle}</p>
        <div className="btn-group">
          <Link to="/booking" className="btn btn-primary">{c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}</Link>
          <Link to="/menu" className="btn btn-secondary">{c({ ua: 'Переглянути меню', ru: 'Открыть меню', en: 'View menu' })}</Link>
        </div>
      </section>

      <div className="home-sections-wrap">
      {/* Services Prices & Events */}
      <section ref={addSectionRef} className="content-section promo-grid-section wave-section glass">
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
      <section ref={addSectionRef} className="content-section home-menu-section wave-section glass">
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

      {/* Booking CTA with Map */}
      <section ref={addSectionRef} className="content-section home-map-booking-section wave-section glass">
        <div className="section-header home-map-booking-header">
          <div>
            <h2>{c({ ua: 'Бронювання', ru: 'Бронирование', en: 'Booking' })}</h2>
            <p className="muted">{c({
              ua: 'Оберіть місце на мапі, а правила броні система покаже сама.',
              ru: 'Выберите место на карте, а правила брони система покажет сама.',
              en: 'Choose a place on the map, and the system will show the right booking rules.'
            })}</p>
          </div>
        </div>
        <div className="home-booking-map">
          <div className="home-booking-map-visual">
            {mapPreview.map ? (
              <MapPreview
                mapData={mapPreview.map}
                mapObjects={mapPreview.objects}
                zones={mapPreview.zones}
                units={mapPreview.units}
                height={500}
                isPreview
                onSelectUnit={openBookingMap}
                onOpenFullMap={() => openBookingMap(null)}
              />
            ) : mapPreview.loading ? (
              <div className="home-map-loading">
                {c({ ua: 'Завантажуємо актуальну мапу...', ru: 'Загружаем актуальную карту...', en: 'Loading live map...' })}
              </div>
            ) : (
              <div className="home-booking-map-cta">
                <p>{c({ ua: 'Оберіть місце на нашій мапі', ru: 'Выберите место на нашей карте', en: 'Choose your spot on our map' })}</p>
              </div>
            )}
          </div>
          <div className="home-booking-map-status">
            <div className="home-map-live-status">
              <i aria-hidden="true" />
              <div>
                <strong>{c({ ua: 'Актуальна доступність', ru: 'Актуальная доступность', en: 'Live availability' })}</strong>
                {mapPreview.timeFrom ? (
                  <small className="home-map-occupancy-time">
                    {mapPreview.isTomorrow
                      ? c({ ua: `Завтра о ${mapPreview.timeFrom}`, ru: `Завтра в ${mapPreview.timeFrom}`, en: `Tomorrow at ${mapPreview.timeFrom}` })
                      : `${c({ ua: 'Стан на', ru: 'Статус на', en: 'Status at' })} ${mapPreview.timeFrom}`}
                  </small>
                ) : null}
              </div>
            </div>
            <div className="home-map-occupancy" aria-label="Venue occupancy">
              <span><i className="legend-dot free" />{c({ ua: 'Вільно', ru: 'Свободно', en: 'Free' })}: {mapOccupancy.free}</span>
              <span><i className="legend-dot busy" />{c({ ua: 'Зайнято', ru: 'Занято', en: 'Busy' })}: {mapOccupancy.busy}</span>
              <span><i className="legend-dot held" />{c({ ua: 'Утримано', ru: 'Удержано', en: 'Held' })}: {mapOccupancy.held}</span>
            </div>
            <button type="button" className="btn btn-primary home-map-open-button" onClick={() => openBookingMap(null)}>
              {c({ ua: 'Обрати місце', ru: 'Выбрать место', en: 'Choose a place' })}
            </button>
          </div>
        </div>
      </section>

      {settings?.galleryImages?.length > 0 ? (
        <section ref={addSectionRef} className="content-section home-gallery-section wave-section glass">
          <div className="section-header">
            <h2>{c({ ua: 'Галерея', ru: 'Галерея', en: 'Gallery' })}</h2>
          </div>
          <GalleryCarousel images={settings.galleryImages} />
        </section>
      ) : null}

      <div ref={addSectionRef} className="wave-section home-weather-section glass">
        <WeatherBlock />
      </div>

      {/* About / Info */}
      <section ref={addSectionRef} className="content-section home-info-section wave-section glass">
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
      </div>
    </>
  );
}

function VisualSchedule({ bookingKind, locale }) {
  const isBeach = bookingKind === 'BEACH';
  const startHour = 8;
  const endHour = 22;
  const totalHours = endHour - startHour;

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
