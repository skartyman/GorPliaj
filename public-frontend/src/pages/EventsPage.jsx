import { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import { eventsApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';

export default function EventsPage() {
  const [state, setState] = useState({ loading: true, error: '', events: [] });
  useMeta('Events · GorPliaj', 'Current GorPliaj events.');

  useEffect(() => {
    eventsApi
      .list()
      .then((events) => setState({ loading: false, error: '', events }))
      .catch(() => setState({ loading: false, error: 'Failed to load events.', events: [] }));
  }, []);

  return (
    <section className="page-block">
      <h1>Events</h1>
      <p className="muted">All published GorPliaj events.</p>
      {state.loading ? <div className="state">Loading events...</div> : null}
      {state.error ? <div className="state state-error">{state.error}</div> : null}
      {!state.loading && !state.error ? (
        state.events.length ? (
          <div className="cards-grid">
            {state.events.map((event, index) => (
              <EventCard key={event.id} event={event} featured={index === 0} />
            ))}
          </div>
        ) : (
          <div className="state">No published events yet.</div>
        )
      ) : null}
    </section>
  );
}
