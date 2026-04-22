import { Link } from 'react-router-dom';
import { formatEventDateRange } from '../lib/events';
import { localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';

export default function EventCard({ event, featured = false }) {
  const { locale } = useLocale();
  const title = localizeField(event.title, locale);
  const shortDescription = localizeField(event.shortDescription, locale);

  return (
    <article className={`event-card${featured ? ' featured' : ''}`}>
      <Link to={`/events/${event.slug}`} className="media-link">
        <img src={event.posterImage || '/icons/lebedi.jpg'} alt={title} loading="lazy" />
        <div className="event-overlay">
          <p className="event-date">{formatEventDateRange(event.startAt, event.endAt, locale === 'en' ? 'en-US' : 'ru-RU')}</p>
          <h3>{title}</h3>
          {shortDescription && <p className="muted" style={{ fontSize: '0.85rem', margin: '6px 0 12px' }}>{shortDescription}</p>}
          <div className="event-actions">
            <span className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
              {locale === 'en' ? 'Details' : 'Подробнее'}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
