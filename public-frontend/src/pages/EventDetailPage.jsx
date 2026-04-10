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
  useMeta(state.event ? `${state.event.title} · ГорПляж` : 'Событие · ГорПляж', state.event?.shortDescription || 'Детали события.');

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => setState({ loading: false, error: '', event }))
      .catch(() => setState({ loading: false, error: 'Не удалось загрузить событие.', event: null }));
  }, [slug]);

  if (state.loading) {
    return <div className="state">Загрузка события...</div>;
  }

  if (state.error || !state.event) {
    return <div className="state state-error">{state.error || 'Событие не найдено.'}</div>;
  }

  const event = state.event;

  return (
    <section className="page-block">
      <Link to="/events" className="text-link">
        Назад к афише
      </Link>
      <article className="event-detail">
        <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} className="event-detail-image" />
        <div>
          <h1>{event.title}</h1>
          <p className="event-date">{formatEventDateRange(event.startAt, event.endAt, locale === 'en' ? 'en-US' : 'ru-RU')}</p>
          <p className="muted">{event.shortDescription}</p>
          <p>{event.fullDescription}</p>
          <div className="hero-cta">
            <Link className="btn btn-primary" to={`/booking?event=${event.slug}`}>
              Забронировать стол
            </Link>
            <Link className="btn btn-secondary" to="/map">
              Открыть карту
            </Link>
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                Купить билет
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
