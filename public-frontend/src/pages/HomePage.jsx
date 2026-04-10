import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { contentApi, eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';

const fallbackMenuPhotos = ['/icons/piano.jpg', '/icons/moonpirs.jpg', '/icons/zakat.jpg', '/icons/lebedi.jpg'];

export default function HomePage() {
  const [state, setState] = useState({ events: [], menuPreviewImages: [], news: [] });
  useMeta('GorPliaj', 'Beach, restaurant, events and booking in one public app.');

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
        { id: 1, title: 'New evening sets', summary: 'Updated the music program for the ближайшие weekends.' },
        { id: 2, title: 'Seasonal menu', summary: 'Added light dishes and signature cocktails.' },
        { id: 3, title: 'Summer bookings', summary: 'Pre-booking is open for evening dates.' }
      ];

  return (
    <div className="home-flow">
      <section className="home-section">
        <div className="section-head">
          <h2>Events</h2>
          <Link to="/events" className="text-link">
            All events
          </Link>
        </div>
        <div className="cards-grid">
          {state.events.length ? (
            state.events.map((event, index) => (
              <article key={event.id} className={`premium-card event-card ${index === 0 ? 'featured' : ''}`}>
                <Link to={`/events/${event.slug}`} className="media-link">
                  <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} loading="lazy" />
                </Link>
                <div className="event-copy">
                  <p className="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
                  <h3>{event.title}</h3>
                  <Link className="btn btn-primary" to={`/events/${event.slug}`}>
                    Open
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="premium-card event-card">
              <img src="/icons/lebedi.jpg" alt="Soon" loading="lazy" />
              <div className="event-copy">
                <p className="event-date">Soon</p>
                <h3>New events will appear soon</h3>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="premium-card booking-card">
          <h2>Booking</h2>
          <p className="muted">Choose a date and table on the interactive map.</p>
          <Link to="/map" className="btn btn-primary">
            Book a table
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>Menu</h2>
          <Link to="/menu" className="text-link">
            Open menu
          </Link>
        </div>
        <div className="gallery-grid">
          {menuPhotos.map((photo) => (
            <article key={photo} className="premium-card menu-image-card">
              <img src={photo} alt="Menu item" loading="lazy" />
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>News</h2>
        <div className="news-stack">
          {newsCards.map((item) => (
            <article key={item.id} className="premium-card news-card">
              <h3>{item.title}</h3>
              <p className="muted">{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <article className="premium-card about-card">
          <h2>About</h2>
          <p className="muted">GorPliaj is a modern restaurant by the sea with live music and evening events.</p>
          <div className="about-grid">
            <p>
              <strong>Phone:</strong> <a href="tel:+380000000000">+38 (000) 000-00-00</a>
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:hello@gorpliaj.com">hello@gorpliaj.com</a>
            </p>
            <p>
              <strong>Address:</strong> Otrada beach, Odesa
            </p>
            <p>
              <strong>Hours:</strong> daily 10:00 - 23:00
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
