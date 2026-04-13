import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';

export default function EventDetailPage() {
  const { locale } = useLocale();
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: '', event: null });
  useMeta(state.event ? `${state.event.title} · GorPliaj` : 'Event · GorPliaj', state.event?.shortDescription || 'Event details.');

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => setState({ loading: false, error: '', event }))
      .catch(() => setState({ loading: false, error: locale === 'en' ? 'Failed to load event.' : 'Не удалось загрузить событие.', event: null }));
  }, [slug]);

  if (state.loading) {
    return <div className="state-msg">{locale === 'en' ? 'Loading event...' : 'Загрузка события...'}</div>;
  }

  if (state.error || !state.event) {
    return <div className="state-msg state-error">{state.error || (locale === 'en' ? 'Event not found.' : 'Событие не найдено.')}</div>;
  }

  const event = state.event;
  const isEn = locale === 'en';

  return (
    <>
      <Link to="/events" className="text-link" style={{ display: 'inline-block', marginBottom: 24 }}>
        ← {isEn ? 'Back to events' : 'Назад к афише'}
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 400px) 1fr', gap: 32, alignItems: 'start' }}>
        <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} />
        </div>
        <div>
          <p className="event-date">{formatEventDateRange(event.startAt, event.endAt, isEn ? 'en-US' : 'ru-RU')}</p>
          <h1 style={{ marginTop: 8 }}>{event.title}</h1>
          <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>{event.shortDescription}</p>
          {event.fullDescription && <p style={{ lineHeight: 1.7, marginTop: 16 }}>{event.fullDescription}</p>}
          <div className="btn-group" style={{ marginTop: 28 }}>
            <Link className="btn btn-primary" to={`/booking?event=${event.slug}`}>
              {isEn ? 'Book a table' : 'Забронировать стол'}
            </Link>
            <Link className="btn btn-secondary" to="/map">
              {isEn ? 'Open map' : 'Открыть карту'}
            </Link>
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                {isEn ? 'Buy ticket' : 'Купить билет'}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
