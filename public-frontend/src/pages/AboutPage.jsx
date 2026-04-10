import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function AboutPage() {
  const { t } = useLocale();
  useMeta(t('aboutMetaTitle'), t('aboutMetaDescription'));

  return (
    <section className="page-block">
      <h1>GorPliaj</h1>
      <p className="muted">Beach restaurant space at Otrada beach in Odesa: daytime rest, kitchen, bar and evening events.</p>
      <div className="split">
        <article>
          <h2>What is available online</h2>
          <ul>
            <li>Current events.</li>
            <li>Venue map and live table statuses.</li>
            <li>Online booking request.</li>
            <li>Public menu from API.</li>
          </ul>
        </article>
        <article>
          <h2>Contacts</h2>
          <p>
            <strong>Location:</strong> Odesa, Otrada beach
          </p>
          <p>
            <strong>Booking:</strong> via <Link to="/booking">/booking</Link>
          </p>
          <p>
            <strong>Map:</strong> <Link to="/map">/map</Link>
          </p>
        </article>
      </div>
    </section>
  );
}
