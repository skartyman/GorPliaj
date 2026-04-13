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
      .catch(() => setState({ loading: false, error: t('eventsLoadError') || 'Не удалось загрузить афишу.', events: [] }));
  }, []);

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{t('navEvents')}</h1>
          <p className="muted">{t('eventsMetaDescription')}</p>
        </div>
      </div>

      {state.loading && <div className="state-msg">{t('eventsLoading') || 'Загрузка событий...'}</div>}
      {state.error && <div className="state-msg state-error">{state.error}</div>}
      {!state.loading && !state.error && (
        state.events.length ? (
          <div className="events-grid">
            {state.events.map((event, index) => (
              <EventCard key={event.id} event={event} featured={index === 0} />
            ))}
          </div>
        ) : (
          <div className="state-msg">{t('eventsEmpty') || 'Пока нет опубликованных событий.'}</div>
        )
      )}
    </>
  );
}
