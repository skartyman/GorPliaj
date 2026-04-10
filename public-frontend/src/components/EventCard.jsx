import { Link } from 'react-router-dom';
import { formatEventDateRange } from '../lib/events';
import { useLocale } from '../state/locale';

export default function EventCard({ event, featured = false }) {
  const { locale } = useLocale();

  return (
    <article className={`premium-card event-card ${featured ? 'featured' : ''}`}>
      <Link to={`/events/${event.slug}`} className="media-link">
        <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} loading="lazy" />
      </Link>
      <div className="event-copy">
        <p className="event-date">{formatEventDateRange(event.startAt, event.endAt, locale === 'en' ? 'en-US' : 'ru-RU')}</p>
        <h3>{event.title}</h3>
        <p className="muted">{event.shortDescription}</p>
        <Link to={`/events/${event.slug}`} className="btn btn-primary">
          {locale === 'en' ? 'Open' : 'Смотреть'}
        </Link>
      </div>
    </article>
  );
}
