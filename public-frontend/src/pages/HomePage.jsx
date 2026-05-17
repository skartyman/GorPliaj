import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { contentApi, eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';
import { localizedCopy, localizeField } from '../lib/i18n';

const fallbackMenuPhotos = ['/icons/piano.jpg', '/icons/moonpirs.jpg', '/icons/zakat.jpg', '/icons/photo_2026-03-22_18-51-11.jpg', '/icons/photo_2026-03-22_18-51-20.jpg'];

export default function HomePage() {
  const { t, locale } = useLocale();
  const { settings } = useSettings();
  const [state, setState] = useState({ events: [], menuPreviewImages: [], news: [] });
  useMeta(t('homeMetaTitle'), t('homeMetaDescription'));

  useEffect(() => {
    async function load() {
      const [events, menu, news] = await Promise.allSettled([eventsApi.list(false), contentApi.menu(), contentApi.news()]);

      setState({
        events: events.status === 'fulfilled' ? events.value.slice(0, 8) : [],
        menuPreviewImages:
          menu.status === 'fulfilled'
            ? menu.value.flatMap((category) => (Array.isArray(category?.items) ? category.items.map((item) => item?.imageUrl).filter(Boolean) : [])).slice(0, 8)
            : [],
        news: news.status === 'fulfilled' && Array.isArray(news.value) ? news.value.slice(0, 4) : []
      });
    }

    load().catch(() => {});
  }, []);

  const menuPhotos = state.menuPreviewImages.length ? state.menuPreviewImages : fallbackMenuPhotos;
  const c = (values) => localizedCopy(values, locale);
  const newsCards = state.news.length
    ? state.news
    : [
        { id: 1, title: c({ ua: 'Нові вечірні сети', ru: 'Новые вечерние сеты', en: 'New evening sets' }), summary: c({ ua: 'Оновили музичну програму на найближчі вихідні.', ru: 'Обновили музыкальную программу на ближайшие выходные.', en: 'Updated music program for the upcoming weekend.' }) },
        { id: 2, title: c({ ua: 'Сезонне меню', ru: 'Сезонное меню', en: 'Seasonal menu' }), summary: c({ ua: 'Додали легкі страви та авторські коктейлі.', ru: 'Добавили лёгкие блюда и авторские коктейли.', en: 'Added light dishes and signature cocktails.' }) },
        { id: 3, title: c({ ua: 'Літні бронювання', ru: 'Летние бронирования', en: 'Summer bookings' }), summary: c({ ua: 'Відкрили попереднє бронювання на вечірні дати.', ru: 'Открыли предварительную бронь на вечерние даты.', en: 'Opened advance booking for evening dates.' }) }
      ];

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

      {/* Events */}
      <section className="content-section">
        <div className="section-header">
          <h2>{c({ ua: 'Афіша', ru: 'Афиша', en: 'Events' })}</h2>
          <Link to="/events" className="text-link">{c({ ua: 'Усі події', ru: 'Все события', en: 'All events' })} →</Link>
        </div>
        <div className="events-grid">
          {state.events.length ? (
            state.events.map((event) => {
              const eventTitle = localizeField(event.title, locale);
              return (
                <article key={event.id} className="event-card">
                  <Link to={`/events/${event.slug}`} className="media-link">
                    <img src={event.posterImage || '/icons/moonpirs.jpg'} alt={eventTitle} loading="lazy" />
                    <div className="event-overlay">
                      <p className="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
                      <h3>{eventTitle}</h3>
                    </div>
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="state-msg">{c({ ua: 'Нові події скоро зʼявляться', ru: 'Новые события скоро появятся', en: 'New events coming soon' })}</div>
          )}
        </div>
      </section>

      {/* Booking CTA */}
      <section className="content-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: 32 }}>
            <h2 style={{ marginBottom: 8 }}>{c({ ua: 'Бронювання', ru: 'Бронирование', en: 'Book a table' })}</h2>
            <p className="muted" style={{ marginBottom: 20 }}>{c({ ua: 'Оберіть дату, кількість гостей та доступний стіл.', ru: 'Выберите дату, количество гостей и доступный стол.', en: 'Choose a date, guest count and an available table.' })}</p>
            <Link to="/booking" className="btn btn-primary">{c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}</Link>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: 32, display: 'grid', placeItems: 'center' }}>
            <img src="/icons/moonpirs.jpg" alt="" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} loading="lazy" />
          </div>
        </div>
      </section>

      {/* Menu Preview */}
      <section className="content-section">
        <div className="section-header">
          <h2>{c({ ua: 'Меню', ru: 'Меню', en: 'Menu' })}</h2>
          <Link to="/menu" className="text-link">{c({ ua: 'Повне меню', ru: 'Открыть меню', en: 'Full menu' })} →</Link>
        </div>
        <div className="gallery-scroll">
          {menuPhotos.map((photo) => (
            <div key={photo} className="gallery-item">
              <img src={photo} alt={c({ ua: 'Позиція меню', ru: 'Позиция меню', en: 'Menu item' })} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* News */}
      <section className="content-section">
        <h2>{c({ ua: 'Новини', ru: 'Новости', en: 'News' })}</h2>
        <div className="news-list">
          {newsCards.map((item) => {
            const title = localizeField(item.title, locale);
            const summary = localizeField(item.summary, locale);
            return (
              <article key={item.id} className="news-item">
                <h3>{title}</h3>
                <p>{summary}</p>
              </article>
            );
          })}
        </div>
      </section>

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
