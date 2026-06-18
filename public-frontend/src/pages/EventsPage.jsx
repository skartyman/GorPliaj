import { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';

export default function EventsPage() {
  const { t, locale } = useLocale();
  const [state, setState] = useState({ loading: true, error: '', events: [] });
  useMeta(t('eventsMetaTitle'), t('eventsMetaDescription'));

  useEffect(() => {
    eventsApi
      .list()
      .then((events) => setState({ loading: false, error: '', events }))
      .catch(() => setState({ loading: false, error: t('eventsLoadError') || 'Не удалось загрузить афишу.', events: [] }));
  }, []);

  const featuredEvent = state.events.find((event) => event.isFeatured) || state.events[0] || null;
  const gridEvents = featuredEvent ? state.events.filter((event) => event.id !== featuredEvent.id) : [];
  const localeCode = locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU');
  const heroTitle = localizedCopy({
    ua: 'Вечори, концерти та special nights',
    ru: 'Вечера, концерты и special nights',
    en: 'Evenings, concerts and special nights'
  }, locale);
  const heroLead = localizedCopy({
    ua: 'Афіша отримала чіткіший ритм: головний акцент на найближчій події, більше повітря між блоками та спокійніша сітка для перегляду.',
    ru: 'Афиша получила более понятный ритм: главный акцент на ближайшем событии, больше воздуха между блоками и спокойная сетка для просмотра.',
    en: 'The lineup now has a clearer rhythm: one strong highlight up top, more breathing room, and a cleaner grid below.'
  }, locale);
  const featuredLabel = localizedCopy({
    ua: 'Найближча подія',
    ru: 'Ближайшее событие',
    en: 'Next highlight'
  }, locale);
  const scheduleLabel = localizedCopy({
    ua: 'У розкладі',
    ru: 'В расписании',
    en: 'On the schedule'
  }, locale);
  const seasonLabel = localizedCopy({
    ua: 'Фокус сезону',
    ru: 'Фокус сезона',
    en: 'Season focus'
  }, locale);
  const fullLineupLabel = localizedCopy({
    ua: 'Уся афіша',
    ru: 'Вся афиша',
    en: 'Full lineup'
  }, locale);
  const moreEventsLabel = localizedCopy({
    ua: 'Ще події',
    ru: 'Еще события',
    en: 'More events'
  }, locale);
  const eventsCountLabel = localizedCopy({
    ua: `${state.events.length} подій`,
    ru: `${state.events.length} событий`,
    en: `${state.events.length} events`
  }, locale);
  const featuredDateLabel = featuredEvent
    ? formatEventDateRange(featuredEvent.startAt, featuredEvent.endAt, localeCode)
    : localizedCopy({
        ua: 'Скоро анонсуємо нові дати',
        ru: 'Скоро анонсируем новые даты',
        en: 'New dates will be announced soon'
      }, locale);
  const featuredTitle = featuredEvent ? localizeField(featuredEvent.title, locale) : '';
  const featuredDescription = featuredEvent
    ? localizeField(featuredEvent.shortDescription, locale) || heroLead
    : '';

  return (
    <>
      <section className="events-hero">
        <div className="events-hero-copy">
          <p className="eyebrow">{t('navEvents')}</p>
          <h1>{heroTitle}</h1>
          <p className="events-hero-lead">{heroLead}</p>
        </div>
        <div className="events-hero-panel">
          <div className="events-stat">
            <span>{scheduleLabel}</span>
            <strong>{eventsCountLabel}</strong>
          </div>
          <div className="events-stat">
            <span>{featuredLabel}</span>
            <strong>{featuredDateLabel}</strong>
          </div>
          <div className="events-stat">
            <span>{seasonLabel}</span>
            <strong>{featuredTitle || t('eventsMetaDescription')}</strong>
          </div>
        </div>
      </section>

      {state.loading && <div className="state-msg">{t('eventsLoading') || 'Загрузка событий...'}</div>}
      {state.error && <div className="state-msg state-error">{state.error}</div>}
      {!state.loading && !state.error && (
        state.events.length ? (
          <div className="events-page-stack">
            {featuredEvent && (
              <section className="events-featured-block">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">{featuredLabel}</p>
                    <h2>{featuredTitle}</h2>
                    <p className="muted events-featured-intro">{featuredDescription}</p>
                  </div>
                </div>
                <EventCard key={featuredEvent.id} event={featuredEvent} featured />
              </section>
            )}

            {gridEvents.length > 0 && (
              <section className="events-grid-section">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">{fullLineupLabel}</p>
                    <h2>{moreEventsLabel}</h2>
                  </div>
                </div>
                <div className="events-grid">
                  {gridEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="state-msg">{t('eventsEmpty') || 'Пока нет опубликованных событий.'}</div>
        )
      )}
    </>
  );
}
