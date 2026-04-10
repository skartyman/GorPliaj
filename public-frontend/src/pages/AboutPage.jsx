import { Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function AboutPage() {
  const { t } = useLocale();
  useMeta(t('aboutMetaTitle'), t('aboutMetaDescription'));

  return (
    <section className="page-block">
      <h1>GorPliaj</h1>
      <p className="muted">Пляжно-ресторанное пространство на пляже Отрада в Одессе: дневной отдых, кухня, бар и вечерние события.</p>
      <div className="split">
        <article>
          <h2>Что доступно онлайн</h2>
          <ul>
            <li>Актуальная афиша событий.</li>
            <li>Карта заведения и живые статусы столов.</li>
            <li>Онлайн-заявка на бронирование.</li>
            <li>Публичное меню из API.</li>
          </ul>
        </article>
        <article>
          <h2>Контакты</h2>
          <p>
            <strong>Локация:</strong> Одесса, пляж Отрада
          </p>
          <p>
            <strong>Бронирование:</strong> через <Link to="/booking">/booking</Link>
          </p>
          <p>
            <strong>Карта:</strong> <Link to="/map">/map</Link>
          </p>
        </article>
      </div>
    </section>
  );
}
