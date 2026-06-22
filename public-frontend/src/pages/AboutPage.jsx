import { Link } from 'react-router-dom';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useSettings } from '../state/settings';
import { useMeta } from '../hooks/useMeta';

const SOCIAL_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  youtube: 'YouTube'
};

function phoneHref(phone) {
  const normalized = String(phone || '').replace(/[^\d+]/g, '');
  return normalized ? `tel:${normalized}` : '';
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = {
  ua: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
};

function formatWorkingHours(workingHours, locale, copy) {
  if (!workingHours) {
    return copy({
      ua: 'Уточнюйте графік за телефоном',
      ru: 'Уточняйте график по телефону',
      en: 'Please call to confirm opening hours'
    });
  }

  if (typeof workingHours === 'string') return workingHours;

  const dayRows = DAY_KEYS
    .map((key, index) => ({ key, label: DAY_LABELS[locale]?.[index] || DAY_LABELS.ua[index], value: workingHours[key] }))
    .filter((day) => day.value?.open || day.value?.close);

  if (dayRows.length) {
    const uniqueRanges = [...new Set(dayRows.map((day) => `${day.value.open || ''}-${day.value.close || ''}`))];
    if (uniqueRanges.length === 1) {
      return copy({
        ua: `Щодня ${uniqueRanges[0]}`,
        ru: `Ежедневно ${uniqueRanges[0]}`,
        en: `Daily ${uniqueRanges[0]}`
      });
    }

    return dayRows
      .map((day) => `${day.label}: ${day.value.open || ''}-${day.value.close || ''}`)
      .join(', ');
  }

  if (workingHours.mode === 'daily' && (workingHours.open || workingHours.close)) {
    return copy({
      ua: `Щодня ${workingHours.open || ''}-${workingHours.close || ''}`,
      ru: `Ежедневно ${workingHours.open || ''}-${workingHours.close || ''}`,
      en: `Daily ${workingHours.open || ''}-${workingHours.close || ''}`
    });
  }

  if (workingHours.text) return localizeField(workingHours.text, locale);
  if (workingHours.ua || workingHours.ru || workingHours.en) return localizeField(workingHours, locale);

  return copy({
    ua: 'Графік буде оновлено',
    ru: 'График будет обновлен',
    en: 'Opening hours will be updated'
  });
}

function normalizeSocialLinks(socialMedia) {
  if (!socialMedia) return [];

  if (Array.isArray(socialMedia)) {
    return socialMedia
      .map((item) => ({
        platform: item.platform || item.label || 'social',
        url: item.url || item.href || ''
      }))
      .filter((item) => item.url);
  }

  if (typeof socialMedia === 'object') {
    return Object.entries(socialMedia)
      .map(([platform, value]) => ({
        platform,
        url: typeof value === 'string' ? value : value?.url || value?.href || ''
      }))
      .filter((item) => item.url);
  }

  return [];
}

export default function AboutPage() {
  const { locale } = useLocale();
  const { settings } = useSettings();
  const c = (values) => localizedCopy(values, locale);

  const aboutTitle = localizeField(settings?.aboutTitle, locale) || c({
    ua: 'Про GorPliaj',
    ru: 'О GorPliaj',
    en: 'About GorPliaj'
  });
  const aboutText = localizeField(settings?.aboutText, locale) || localizeField(settings?.description, locale) || c({
    ua: 'GorPliaj - пляжний простір біля моря: кухня, бар, події та зручне бронювання столів.',
    ru: 'GorPliaj - пляжное пространство у моря: кухня, бар, события и удобное бронирование столов.',
    en: 'GorPliaj is a seaside space with food, bar, events and convenient table booking.'
  });
  const addressText = localizeField(settings?.address, locale) || c({
    ua: 'Одеса, пляж Відрада',
    ru: 'Одесса, пляж Отрада',
    en: 'Otrada Beach, Odesa'
  });
  const phone = settings?.phone || '';
  const email = settings?.email || '';
  const hours = formatWorkingHours(settings?.workingHours, locale, c);
  const socialLinks = normalizeSocialLinks(settings?.socialMedia);
  const imageUrl = settings?.aboutImageUrl || settings?.logoUrl || '/icons/Logo.png';

  useMeta(aboutTitle, aboutText.slice(0, 160));

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="eyebrow">{c({ ua: 'Про нас', ru: 'О нас', en: 'About us' })}</p>
          <h1>{aboutTitle}</h1>
          <p className="about-lead">{aboutText}</p>
          <div className="btn-group">
            <Link to="/booking" className="btn btn-primary">
              {c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}
            </Link>
            <Link to="/menu" className="btn btn-secondary">
              {c({ ua: 'Подивитися меню', ru: 'Посмотреть меню', en: 'View menu' })}
            </Link>
          </div>
        </div>
        <div className="about-hero-media">
          <img src={imageUrl} alt={aboutTitle} />
        </div>
      </section>

      <section className="about-card-grid">
        <article className="about-card">
          <h2>{c({ ua: 'Контакти', ru: 'Контакты', en: 'Contacts' })}</h2>
          <div className="about-contact-list">
            <p>
              <span>{c({ ua: 'Адреса', ru: 'Адрес', en: 'Address' })}</span>
              <strong>{addressText}</strong>
            </p>
            {phone ? (
              <p>
                <span>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</span>
                <a href={phoneHref(phone)}>{phone}</a>
              </p>
            ) : null}
            {email ? (
              <p>
                <span>Email</span>
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            ) : null}
            <p>
              <span>{c({ ua: 'Графік', ru: 'График', en: 'Hours' })}</span>
              <strong>{hours}</strong>
            </p>
          </div>
        </article>

        <article className="about-card">
          <h2>{c({ ua: 'Соцмережі', ru: 'Соцсети', en: 'Social media' })}</h2>
          {socialLinks.length ? (
            <div className="about-social-list">
              {socialLinks.map((item) => (
                <a key={`${item.platform}-${item.url}`} href={item.url} target="_blank" rel="noreferrer">
                  {SOCIAL_LABELS[item.platform?.toLowerCase()] || item.platform}
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">
              {c({
                ua: 'Посилання на соцмережі можна додати в адмінці.',
                ru: 'Ссылки на соцсети можно добавить в админке.',
                en: 'Social links can be added in the admin panel.'
              })}
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
