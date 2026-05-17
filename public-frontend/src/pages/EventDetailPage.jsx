import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';

export default function EventDetailPage() {
  const { locale } = useLocale();
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: '', event: null });
  const c = (values) => localizedCopy(values, locale);
  const metaTitle = localizeField(state.event?.title, locale);
  const metaDescription = localizeField(state.event?.shortDescription, locale);
  useMeta(state.event ? `${metaTitle} · GorPliaj` : 'Event · GorPliaj', metaDescription || 'Event details.');

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => setState({ loading: false, error: '', event }))
      .catch(() => setState({ loading: false, error: c({ ua: 'Не вдалося завантажити подію.', ru: 'Не удалось загрузить событие.', en: 'Failed to load event.' }), event: null }));
  }, [slug, locale]);

  if (state.loading) {
    return <div className="state-msg">{c({ ua: 'Завантаження події...', ru: 'Загрузка события...', en: 'Loading event...' })}</div>;
  }

  if (state.error || !state.event) {
    return <div className="state-msg state-error">{state.error || c({ ua: 'Подію не знайдено.', ru: 'Событие не найдено.', en: 'Event not found.' })}</div>;
  }

  const event = state.event;
  const title = localizeField(event.title, locale);
  const shortDescription = localizeField(event.shortDescription, locale);
  const fullDescription = localizeField(event.fullDescription, locale);

  return (
    <>
      <Link to="/events" className="text-link" style={{ display: 'inline-block', marginBottom: 24 }}>
        ← {c({ ua: 'Назад до афіші', ru: 'Назад к афише', en: 'Back to events' })}
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 400px) 1fr', gap: 32, alignItems: 'start' }}>
        <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <img src={event.posterImage || '/icons/lebedi.jpg'} alt={title} style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} />
        </div>
        <div>
          <p className="event-date">{formatEventDateRange(event.startAt, event.endAt, locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU'))}</p>
          <h1 style={{ marginTop: 8 }}>{title}</h1>
          <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>{shortDescription}</p>
          {fullDescription && <p style={{ lineHeight: 1.7, marginTop: 16 }}>{fullDescription}</p>}
          <div className="btn-group" style={{ marginTop: 28 }}>
            <Link className="btn btn-primary" to={`/booking?event=${event.slug}`}>
              {c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}
            </Link>
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                {c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
