import { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import { eventsApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';

export default function EventsPage() {
  const { t } = useLocale();
  const [state, setState] = useState({ loading: true, error: '', events: [] });
  useMeta(t('eventsMetaTitle'), t('eventsMetaDescription'));

  useEffect(() => {
    eventsApi
      .list()
      .then((events) => setState({ loading: false, error: '', events }))
      .catch(() => setState({ loading: false, error: 'Не удалось загрузить афишу.', events: [] }));
  }, []);

  return (
    <section className="page-block">
      <h1>Афиша</h1>
      <p className="muted">Все опубликованные события ГорПляжа.</p>
      {state.loading ? <div className="state">Загрузка событий...</div> : null}
      {state.error ? <div className="state state-error">{state.error}</div> : null}
      {!state.loading && !state.error ? (
        state.events.length ? (
          <div className="cards-grid">
            {state.events.map((event, index) => (
              <EventCard key={event.id} event={event} featured={index === 0} />
            ))}
          </div>
        ) : (
          <div className="state">Пока нет опубликованных событий.</div>
        )
      ) : null}
    </section>
  );
}
