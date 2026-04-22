import { Link } from 'react-router-dom';
import { localizedCopy } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function AboutPage() {
  const { t, locale } = useLocale();
  useMeta(t('aboutMetaTitle'), t('aboutMetaDescription'));

  const c = (values) => localizedCopy(values, locale);

  return (
    <>
      <div className="section-header">
        <div>
          <h1>GorPliaj</h1>
          <p className="muted">
            {c({
              ua: 'Пляжно-ресторанний простір на пляжі Відрада в Одесі: денний відпочинок, кухня, бар і вечірні події.',
              ru: 'Пляжно-ресторанное пространство на пляже Отрада в Одессе: дневной отдых, кухня, бар и вечерние события.',
              en: 'Beach restaurant at Otrada Beach, Odesa: daytime leisure, cuisine, bar and evening events.'
            })}
          </p>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-block">
          <h3>{c({ ua: 'Що доступно онлайн', ru: 'Что доступно онлайн', en: 'What\'s available online' })}</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>{c({ ua: 'Актуальна афіша подій', ru: 'Актуальная афиша событий', en: 'Current events schedule' })}</li>
            <li>{c({ ua: 'Карта закладу та живі статуси столів', ru: 'Карта заведения и живые статусы столов', en: 'Venue map and live table statuses' })}</li>
            <li>{c({ ua: 'Онлайн-заявка на бронювання', ru: 'Онлайн-заявка на бронирование', en: 'Online booking request' })}</li>
            <li>{c({ ua: 'Публічне меню з API', ru: 'Публичное меню из API', en: 'Public menu from API' })}</li>
          </ul>
        </div>
        <div className="info-block">
          <h3>{c({ ua: 'Контакти', ru: 'Контакты', en: 'Contacts' })}</h3>
          <p>📍 {c({ ua: 'Одеса, пляж Відрада', ru: 'Одесса, пляж Отрада', en: 'Otrada Beach, Odesa' })}</p>
          <p>📞 <a href="tel:+380000000000">+38 (000) 000-00-00</a></p>
          <p>✉️ <a href="mailto:hello@gorpliaj.com">hello@gorpliaj.com</a></p>
          <p>🕐 {c({ ua: 'Щодня 10:00-23:00', ru: 'Ежедневно 10:00-23:00', en: 'Daily 10:00-23:00' })}</p>
          <p style={{ marginTop: 12 }}>
            {c({ ua: 'Бронювання', ru: 'Бронирование', en: 'Booking' })}: <Link to="/booking" className="text-link">/booking</Link>
          </p>
          <p>
            {c({ ua: 'Карта', ru: 'Карта', en: 'Map' })}: <Link to="/map" className="text-link">/map</Link>
          </p>
          <p>
            {c({ ua: 'Меню', ru: 'Меню', en: 'Menu' })}: <Link to="/menu" className="text-link">/menu</Link>
          </p>
        </div>
      </div>
    </>
  );
}
