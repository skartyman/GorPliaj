import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { useMeta } from '../hooks/useMeta';

export default function EventDetailPage() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: '', event: null });
  useMeta(state.event ? `${state.event.title} · GorPliaj` : 'Event · GorPliaj', state.event?.shortDescription || 'Event details.');

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => setState({ loading: false, error: '', event }))
      .catch(() => setState({ loading: false, error: 'Failed to load event.', event: null }));
  }, [slug]);

  if (state.loading) {
    return <div className="state">Loading event...</div>;
  }

  if (state.error || !state.event) {
    return <div className="state state-error">{state.error || 'Event not found.'}</div>;
  }

  const event = state.event;

  return (
    <section className="page-block">
      <Link to="/events" className="text-link">
        Back to events
      </Link>
      <article className="event-detail">
        <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} className="event-detail-image" />
        <div>
          <h1>{event.title}</h1>
          <p className="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
          <p className="muted">{event.shortDescription}</p>
          <p>{event.fullDescription}</p>
          <div className="hero-cta">
            <Link className="btn btn-primary" to={`/booking?event=${event.slug}`}>
              Book a table
            </Link>
            <Link className="btn btn-secondary" to="/map">
              Open map
            </Link>
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                Buy ticket
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
