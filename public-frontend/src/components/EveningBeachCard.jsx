import { useState } from 'react';
import { useLocale } from '../state/locale';
import { localizedCopy } from '../lib/i18n';
import { guestApi } from '../lib/api';

function localizedField(field, locale) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field.ua || field.en || '';
}

const POSITION_LABELS = {
  BUNGALOW: { ua: 'Бунгало', ru: 'Бунгало', en: 'Bungalow' },
  KROVAT: { ua: 'Кровать', ru: 'Кровать', en: 'Bed' },
  PIER: { ua: 'Пірс', ru: 'Пирс', en: 'Pier' }
};

export default function EveningBeachCard({ data, onPurchased }) {
  const { locale } = useLocale();
  const c = (values) => localizedCopy(values, locale);
  const [purchasing, setPurchasing] = useState(null);

  if (!data || !data.beds || data.beds.length === 0) return null;

  const { date, isToday, cutoffPassed, computedTimeFrom } = data;

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

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(
    locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US',
    { day: 'numeric', month: 'long' }
  );

  const title = isToday
    ? c({ ua: 'Пляж · сьогодні', ru: 'Пляж · сегодня', en: 'Beach · today' })
    : c({ ua: `Пляж · завтра, ${formattedDate}`, ru: `Пляж · завтра, ${formattedDate}`, en: `Beach · tomorrow, ${formattedDate}` });

  return (
    <div className="evening-beach-card">
      <p className="evening-beach-title">{title}</p>

      {computedTimeFrom && isToday && (
        <p className="evening-beach-subtitle">
          {c({ ua: `Заселення з ${computedTimeFrom}`, ru: `Заезд с ${computedTimeFrom}`, en: `Check-in from ${computedTimeFrom}` })}
        </p>
      )}

      <div className="evening-beach-list">
        {data.beds.map((bed) => {
          const posLabel = POSITION_LABELS[bed.positionType] || POSITION_LABELS.KROVAT;
          const isFree = bed.status === 'free';
          const canBuy = isFree && !cutoffPassed;
          const isBuying = purchasing === bed.tableId;

          return (
            <div key={bed.tableId} className="evening-beach-item">
              <div className="evening-beach-item-info">
                <span className="evening-beach-item-icon">{isFree ? '\u2713' : '\u2716'}</span>
                <div className="evening-beach-item-details">
                  <span className="evening-beach-item-name">{bed.name}</span>
                  <span className="evening-beach-item-type">{c(posLabel)}</span>
                </div>
                <span className="evening-beach-item-price">{bed.price} ₴</span>
              </div>
              <div className="evening-beach-item-action">
                {isFree ? (
                  canBuy ? (
                    <button
                      className="evening-beach-buy-btn"
                      onClick={() => handlePurchase(bed.tableId)}
                      disabled={isBuying}
                    >
                      {isBuying ? '...' : c({ ua: 'Купити', ru: 'Купить', en: 'Buy' })}
                    </button>
                  ) : (
                    <span className="evening-beach-status-label free">
                      {c({ ua: 'Вільно', ru: 'Свободно', en: 'Free' })}
                    </span>
                  )
                ) : (
                  <span className="evening-beach-status-label busy">
                    {c({ ua: 'Зайнято', ru: 'Занято', en: 'Busy' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cutoffPassed ? (
        <p className="evening-beach-footer">
          {c({ ua: 'Купити можна до 17:00', ru: 'Купить можно до 17:00', en: 'Available to purchase until 17:00' })}
        </p>
      ) : (
        <p className="evening-beach-footer">
          {c({ ua: 'На весь день до 20:00', ru: 'На весь день до 20:00', en: 'Full day until 20:00' })}
        </p>
      )}
    </div>
  );
}
