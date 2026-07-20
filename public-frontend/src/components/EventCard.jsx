import { Link } from 'react-router-dom';
import { formatEventDateRange } from '../lib/events';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';

export default function EventCard({ event, featured = false }) {
  const { locale } = useLocale();
  const title = localizeField(event.title, locale);
  const shortDescription = localizeField(event.shortDescription, locale);
  const eventDate = formatEventDateRange(
    event.startAt,
    event.endAt,
    locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU')
  );
  const featuredSummary = shortDescription || localizedCopy({
    ua: 'Музика, атмосфера вечора, коктейлі та бронювання найкращих місць біля моря.',
    ru: 'Музыка, атмосфера вечера, коктейли и бронирование лучших мест у моря.',
    en: 'Music, evening atmosphere, cocktails, and the best seaside spots to book.'
  }, locale);
  const dateLabel = localizedCopy({
    ua: 'Дата',
    ru: 'Дата',
    en: 'Date'
  }, locale);
  const detailsLabel = localizedCopy({
    ua: 'Детальніше',
    ru: 'Подробнее',
    en: 'Details'
  }, locale);
  const spotlightLabel = localizedCopy({
    ua: 'Рекомендація сезону',
    ru: 'Рекомендация сезона',
    en: 'Season pick'
  }, locale);
  const buyTicketLabel = localizedCopy({
    ua: 'Купити квиток',
    ru: 'Купить билет',
    en: 'Buy ticket'
  }, locale);
  const bookTableLabel = localizedCopy({
    ua: 'Забронювати стіл',
    ru: 'Забронировать стол',
    en: 'Book a table'
  }, locale);

  return (
    <article className={`event-card${featured ? ' featured' : ''}`}>
      <Link to={`/events/${event.slug}`} className="media-link">
        <div className="event-card-media">
          <img src={event.posterImage || '/icons/lebedi.jpg'} alt={title} loading="lazy" />
          {featured ? <span className="event-pill">{spotlightLabel}</span> : null}
        </div>
      </Link>
      <div className="event-card-body">
        <p className="event-date">
          <span>{dateLabel}</span>
          {eventDate}
        </p>
        {!featured ? (
          <h3>
            <Link to={`/events/${event.slug}`} className="event-title-link">{title}</Link>
          </h3>
        ) : null}
        {featured ? (
          <p className="event-featured-summary">{featuredSummary}</p>
        ) : (
          <p className="event-card-summary" style={{
            fontSize: '0.88rem',
            lineHeight: '1.6',
            color: 'var(--muted)',
            margin: '4px 0 12px 0',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {featuredSummary}
          </p>
        )}
        <div className="event-actions">
          {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') ? (
            event.ticketUrl ? (
              <a className="btn btn-secondary event-action-btn" href={event.ticketUrl} target="_blank" rel="noreferrer">
                {buyTicketLabel}
              </a>
            ) : (
              <Link className="btn btn-secondary event-action-btn" to={`/events/${event.slug}?focus=tickets#tickets`}>
                {buyTicketLabel}
              </Link>
            )
          ) : null}
          {(event.ctaType === 'BOOKING' || event.ctaType === 'BOTH') ? (
            <Link className="btn btn-primary event-action-btn" to={`/booking?event=${event.slug}&tableOnly=1`}>
              {bookTableLabel}
            </Link>
          ) : null}
        </div>
        <div className="event-actions event-actions-secondary">
          <Link to={`/events/${event.slug}`} className="event-link">{detailsLabel}</Link>
        </div>
      </div>
    </article>
  );
}
