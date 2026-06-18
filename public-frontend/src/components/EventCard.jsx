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
  const summary = shortDescription || localizedCopy({
    ua: 'Вечірня програма, музика та атмосфера біля моря.',
    ru: 'Вечерняя программа, музыка и атмосфера у моря.',
    en: 'An evening program, music and a beachside atmosphere.'
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

  return (
    <article className={`event-card${featured ? ' featured' : ''}`}>
      <Link to={`/events/${event.slug}`} className="media-link">
        <div className="event-card-media">
          <img src={event.posterImage || '/icons/lebedi.jpg'} alt={title} loading="lazy" />
          {featured && <span className="event-pill">{spotlightLabel}</span>}
        </div>
        <div className="event-card-body">
          <p className="event-date">
            <span>{dateLabel}</span>
            {eventDate}
          </p>
          <h3>{title}</h3>
          <p className="event-summary">{summary}</p>
          <div className="event-actions">
            <span className="event-link">{detailsLabel}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
