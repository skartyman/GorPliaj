import { useLocale } from '../state/locale';
import { localizedCopy } from '../lib/i18n';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { guestApi } from '../lib/api';

function localizedField(field, locale) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field.ua || field.en || '';
}

const MOOD_ICONS = { good: '\u2600\uFE0F', moderate: '\uD83C\uDF24\uFE0F', bad: '\uD83C\uDF27\uFE0F' };

const STATUS_LABELS = {
  free: { ua: 'Вільний', ru: 'Свободен', en: 'Free' },
  busy: { ua: 'Зайнятий', ru: 'Занят', en: 'Occupied' },
  held: { ua: 'Зарезервований', ru: 'Зарезервирован', en: 'Held' },
  unknown: { ua: 'Невідомо', ru: 'Неизвестно', en: 'Unknown' }
};

function statusColor(status) {
  if (status === 'free') return '#4caf50';
  if (status === 'busy' || status === 'held') return '#ff9800';
  return 'var(--muted)';
}

export default function WelcomeCard({ data, onPurchased }) {
  const { locale } = useLocale();
  const c = (values) => localizedCopy(values, locale);
  const [purchasing, setPurchasing] = useState(null);

  if (!data) return null;

  const { weather, favoriteTables, favoriteDishes, suggestions } = data;
  const mood = weather?.mood || 'good';
  const icon = MOOD_ICONS[mood] || MOOD_ICONS.good;

  const greeting = weather?.greeting || c({
    ua: 'Ласкаво просимо!',
    ru: 'Добро пожаловать!',
    en: 'Welcome!'
  });

  const handlePurchase = async (tableId) => {
    setPurchasing(tableId);
    try {
      const result = await guestApi.purchaseEveningBeach(tableId);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      alert(err.message || c({ ua: 'Не вдалося купити.', ru: 'Не удалось купить.', en: 'Purchase failed.' }));
      setPurchasing(null);
    }
  };

  return (
    <div className={`welcome-card welcome-${mood}`}>
      <div className="welcome-weather">
        <span className="welcome-weather-icon">{icon}</span>
        <div className="welcome-weather-text">
          <p className="welcome-greeting">{greeting}</p>
          {weather && (
            <p className="welcome-weather-details">
              {weather.tempAir != null && `${Math.round(weather.tempAir)}°C`}
              {weather.tempWater != null && ` \u00B7 ${c({ ua: 'море', ru: 'море', en: 'sea' })} ${Math.round(weather.tempWater)}°C`}
              {weather.windSpeed != null && ` \u00B7 ${c({ ua: 'вітер', ru: 'ветер', en: 'wind' })} ${Math.round(weather.windSpeed)} km/h`}
              {weather.precipProb != null && weather.precipProb > 0 && ` \u00B7 ${weather.precipProb}% ${c({ ua: 'опадів', ru: 'осадков', en: 'rain' })}`}
            </p>
          )}
        </div>
      </div>

      {favoriteTables.length > 0 && (
        <div className="welcome-section">
          <p className="welcome-section-title">{c({ ua: 'Улюблені місця', ru: 'Избранные места', en: 'Favorite spots' })}</p>
          {favoriteTables.map((t) => {
            const canBuy = t.isBeach && t.status === 'free';
            const isBuying = purchasing === t.tableId;
            return (
              <div key={t.tableId} className="welcome-item">
                <span className="welcome-item-status" style={{ color: statusColor(t.status) }}>
                  {t.status === 'free' ? '\u2713' : t.status === 'busy' || t.status === 'held' ? '\u2716' : '?'}
                </span>
                <span className="welcome-item-name">{localizedField(t.name, locale)}</span>
                <span className="welcome-item-label" style={{ color: statusColor(t.status) }}>
                  {c(STATUS_LABELS[t.status] || STATUS_LABELS.unknown)}
                </span>
                {t.price > 0 && (
                  <span className="welcome-item-price">{t.price} ₴</span>
                )}
                {canBuy && (
                  <button
                    className="welcome-buy-btn"
                    onClick={() => handlePurchase(t.tableId)}
                    disabled={isBuying}
                  >
                    {isBuying ? '...' : c({ ua: 'Купити', ru: 'Купить', en: 'Buy' })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {favoriteDishes.length > 0 && (
        <div className="welcome-section">
          <p className="welcome-section-title">{c({ ua: 'Улюблені страви', ru: 'Избранные блюда', en: 'Favorite dishes' })}</p>
          {favoriteDishes.map((d) => (
            <div key={d.menuItemId} className="welcome-item">
              <span className="welcome-item-status" style={{ color: d.isAvailable ? '#4caf50' : '#ff9800' }}>
                {d.isAvailable ? '\u2713' : '\u2716'}
              </span>
              <span className="welcome-item-name">{localizedField(d.name, locale)}</span>
              <span className="welcome-item-label" style={{ color: d.isAvailable ? '#4caf50' : '#ff9800' }}>
                {d.isAvailable
                  ? c({ ua: 'в наявності', ru: 'в наличии', en: 'available' })
                  : c({ ua: 'немає', ru: 'нет', en: 'unavailable' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {weather?.bestDay && mood === 'bad' && (
        <div className="welcome-bestday">
          {c({ ua: 'Найкращий день для відпочинку:', ru: 'Лучший день для отдыха:', en: 'Best day for a visit:' })}{' '}
          <strong>
            {new Date(`${weather.bestDay.date}T12:00:00Z`).toLocaleDateString(locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'Europe/Kyiv', weekday: 'long', day: 'numeric', month: 'long' })}
            {' '}{Math.round(weather.bestDay.tempMax)}°C
          </strong>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="welcome-actions">
          {suggestions.map((s, i) => (
            <Link key={i} to={s.link} className="welcome-action-btn">
              {s.message}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
