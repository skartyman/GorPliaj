import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { contentApi, eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';

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
  const newsCards = state.news.length
    ? state.news
    : [
        { id: 1, title: locale === 'en' ? 'New evening sets' : 'Новые вечерние сеты', summary: locale === 'en' ? 'Updated music program for the upcoming weekend.' : 'Обновили музыкальную программу на ближайшие выходные.' },
        { id: 2, title: locale === 'en' ? 'Seasonal menu' : 'Сезонное меню', summary: locale === 'en' ? 'Added light dishes and signature cocktails.' : 'Добавили лёгкие блюда и авторские коктейли.' },
        { id: 3, title: locale === 'en' ? 'Summer bookings' : 'Летние бронирования', summary: locale === 'en' ? 'Opened advance booking for evening dates.' : 'Открыли предварительную бронь на вечерние даты.' }
      ];

  const isEn = locale === 'en';
  const heroTitle = (isEn ? settings?.heroTitle?.en : settings?.heroTitle?.ru) || 'GorPliaj';
  const heroSubtitle = (isEn ? settings?.heroSubtitle?.en : settings?.heroSubtitle?.ru) || (isEn ? 'Beach restaurant with live music, cuisine and evening events at Otrada Beach, Odesa' : 'Пляжно-ресторанное пространство с живой музыкой, кухней и вечерними событиями на пляже Отрада, Одесса');

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
          <div className="btn-group">
            <Link to="/booking" className="btn btn-primary">{isEn ? 'Book a table' : 'Забронировать стол'}</Link>
            <Link to="/menu" className="btn btn-secondary">{isEn ? 'View menu' : 'Открыть меню'}</Link>
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="content-section">
        <div className="section-header">
          <h2>{isEn ? 'Events' : 'Афиша'}</h2>
          <Link to="/events" className="text-link">{isEn ? 'All events' : 'Все события'} →</Link>
        </div>
        <div className="events-grid">
          {state.events.length ? (
            state.events.map((event) => (
              <article key={event.id} className="event-card">
                <Link to={`/events/${event.slug}`} className="media-link">
                  <img src={event.posterImage || '/icons/moonpirs.jpg'} alt={event.title} loading="lazy" />
                  <div className="event-overlay">
                    <p className="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
                    <h3>{event.title}</h3>
                  </div>
                </Link>
              </article>
            ))
          ) : (
            <div className="state-msg">{isEn ? 'New events coming soon' : 'Новые события скоро появятся'}</div>
          )}
        </div>
      </section>

      {/* Booking CTA */}
      <section className="content-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: 32 }}>
            <h2 style={{ marginBottom: 8 }}>{isEn ? 'Book a table' : 'Бронирование'}</h2>
            <p className="muted" style={{ marginBottom: 20 }}>{isEn ? 'Choose a date and table on the interactive venue map.' : 'Выберите дату и стол на интерактивной карте заведения.'}</p>
            <Link to="/map" className="btn btn-primary">{isEn ? 'Open map' : 'Открыть карту'}</Link>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: 32, display: 'grid', placeItems: 'center' }}>
            <img src="/icons/moonpirs.jpg" alt="" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} loading="lazy" />
          </div>
        </div>
      </section>

      {/* Menu Preview */}
      <section className="content-section">
        <div className="section-header">
          <h2>{isEn ? 'Menu' : 'Меню'}</h2>
          <Link to="/menu" className="text-link">{isEn ? 'Full menu' : 'Открыть меню'} →</Link>
        </div>
        <div className="gallery-scroll">
          {menuPhotos.map((photo) => (
            <div key={photo} className="gallery-item">
              <img src={photo} alt={isEn ? 'Menu item' : 'Позиция меню'} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* News */}
      <section className="content-section">
        <h2>{isEn ? 'News' : 'Новости'}</h2>
        <div className="news-list">
          {newsCards.map((item) => (
            <article key={item.id} className="news-item">
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      {/* About / Info */}
      <section className="content-section">
        <div className="info-grid">
          <div className="info-block">
            <h3>{isEn ? 'Location' : 'Локация'}</h3>
            <p>{settings?.address || (isEn ? 'Otrada Beach, Odesa' : 'пляж Отрада, Одесса')}</p>
            <p>{
                settings?.workingHours?.mon?.open 
                  ? (isEn 
                      ? `Mon-Thu ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Fri-Sun ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`
                      : `Пн-Чт ${settings.workingHours.mon.open}-${settings.workingHours.mon.close}, Пт-Вс ${settings.workingHours.fri.open}-${settings.workingHours.fri.close}`)
                  : (isEn ? 'Daily 09:00 – 21:00' : 'Ежедневно 09:00 – 21:00')
              }</p>
          </div>
          <div className="info-block">
            <h3>{isEn ? 'Contacts' : 'Контакты'}</h3>
            <p><a href={`tel:${settings?.phone || '+380000000000'}`}>{settings?.phone || '+38 (000) 000-00-00'}</a></p>
            {settings?.socialMedia?.length > 0 && (
              <div className="info-socials" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {settings.socialMedia.map((social, idx) => {
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
            <h3>{isEn ? 'Online' : 'Онлайн'}</h3>
            <p><Link to="/events">{isEn ? 'Events schedule' : 'Афиша событий'}</Link></p>
            <p><Link to="/menu">{isEn ? 'Public menu' : 'Публичное меню'}</Link></p>
            <p><Link to="/map">{isEn ? 'Interactive map' : 'Интерактивная карта'}</Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
