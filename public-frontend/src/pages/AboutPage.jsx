import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function AboutPage() {
  const { t, locale } = useLocale();
  useMeta(t('aboutMetaTitle'), t('aboutMetaDescription'));

  const isEn = locale === 'en';

  return (
    <>
      <div className="section-header">
        <div>
          <h1>GorPliaj</h1>
          <p className="muted">
            {isEn
              ? 'Beach restaurant at Otrada Beach, Odesa: daytime leisure, cuisine, bar and evening events.'
              : 'Пляжно-ресторанное пространство на пляже Отрада в Одессе: дневной отдых, кухня, бар и вечерние события.'}
          </p>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-block">
          <h3>{isEn ? 'What\'s available online' : 'Что доступно онлайн'}</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>{isEn ? 'Current events schedule' : 'Актуальная афиша событий'}</li>
            <li>{isEn ? 'Venue map and live table statuses' : 'Карта заведения и живые статусы столов'}</li>
            <li>{isEn ? 'Online booking request' : 'Онлайн-заявка на бронирование'}</li>
            <li>{isEn ? 'Public menu from API' : 'Публичное меню из API'}</li>
          </ul>
        </div>
        <div className="info-block">
          <h3>{isEn ? 'Contacts' : 'Контакты'}</h3>
          <p>📍 {isEn ? 'Otrada Beach, Odesa' : 'Одесса, пляж Отрада'}</p>
          <p>📞 <a href="tel:+380000000000">+38 (000) 000-00-00</a></p>
          <p>✉️ <a href="mailto:hello@gorpliaj.com">hello@gorpliaj.com</a></p>
          <p>🕐 {isEn ? 'Daily 10:00 – 23:00' : 'Ежедневно 10:00 – 23:00'}</p>
          <p style={{ marginTop: 12 }}>
            {isEn ? 'Booking' : 'Бронирование'}: <Link to="/booking" className="text-link">/booking</Link>
          </p>
          <p>
            {isEn ? 'Map' : 'Карта'}: <Link to="/map" className="text-link">/map</Link>
          </p>
          <p>
            {isEn ? 'Menu' : 'Меню'}: <Link to="/menu" className="text-link">/menu</Link>
          </p>
        </div>
      </div>
    </>
  );
}
