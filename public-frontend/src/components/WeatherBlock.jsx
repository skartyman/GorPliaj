import { useEffect, useState } from 'react';
import { contentApi } from '../lib/api';
import { useLocale } from '../state/locale';

const translations = {
  ua: {
    title: 'Погода в Отраді',
    updated: 'оновлено',
    airTitle: 'Отрада зараз',
    seaTitle: 'Море зараз',
    feelsLike: 'відчувається',
    approxWater: 'орієнтовна температура моря',
    wave: 'Хвиля',
    wind: 'Вітер',
    windGusts: 'Пориви',
    humidity: 'Вологість',
    precipProb: 'Ймовірність опадів',
    uvIndex: 'UV індекс',
    sunrise: 'Схід',
    sunset: 'Захід',
    loading: 'Завантаження погоди...',
    error: 'Не вдалося завантажити погоду',
    m: 'м',
    kmh: 'км/год'
  },
  ru: {
    title: 'Погода в Отраде',
    updated: 'обновлено',
    airTitle: 'Отрада сейчас',
    seaTitle: 'Море сейчас',
    feelsLike: 'ощущается',
    approxWater: 'ориентировочная температура моря',
    wave: 'Волна',
    wind: 'Ветер',
    windGusts: 'Порывы',
    humidity: 'Влажность',
    precipProb: 'Вероятность осадков',
    uvIndex: 'UV индекс',
    sunrise: 'Восход',
    sunset: 'Закат',
    loading: 'Загрузка погоды...',
    error: 'Не удалось загрузить погоду',
    m: 'м',
    kmh: 'км/ч'
  },
  en: {
    title: 'Weather in Otrada',
    updated: 'updated',
    airTitle: 'Otrada Now',
    seaTitle: 'Sea Now',
    feelsLike: 'feels like',
    approxWater: 'approximate sea temp',
    wave: 'Wave',
    wind: 'Wind',
    windGusts: 'Gusts',
    humidity: 'Humidity',
    precipProb: 'Precipitation prob.',
    uvIndex: 'UV index',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    loading: 'Loading weather...',
    error: 'Failed to load weather',
    m: 'm',
    kmh: 'km/h'
  }
};

function formatTemp(temp) {
  if (temp === null || temp === undefined) return '--';
  const num = Math.round(temp);
  return num > 0 ? `+${num}°` : `${num}°`;
}

function formatTime(isoString) {
  if (!isoString) return '';
  try {
    return new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(new Date(isoString));
  } catch {
    return '';
  }
}

function getWindDirection(deg, lang) {
  if (deg === null || deg === undefined) return '';
  const directions = {
    ua: ['Пн', 'Пн-Сх', 'Сх', 'Пд-Сх', 'Пд', 'Пд-Зх', 'Зх', 'Пн-Зх'],
    ru: ['С', 'С-В', 'В', 'Ю-В', 'Ю', 'Ю-З', 'З', 'С-З'],
    en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  };
  const idx = Math.round(deg / 45) % 8;
  return directions[lang]?.[idx] || directions['en']?.[idx] || '';
}

function getWeatherInfo(code, isDay) {
  const c = (ua, ru, en) => ({ ua, ru, en });
  switch (code) {
    case 0:
      return {
        icon: isDay ? '☀️' : '🌙',
        text: c('Ясно', 'Ясно', 'Clear')
      };
    case 1:
    case 2:
      return {
        icon: isDay ? '🌤️' : '🌙',
        text: c('Переважно ясно', 'Преимущественно ясно', 'Mainly clear')
      };
    case 3:
      return {
        icon: '☁️',
        text: c('Хмарно', 'Облачно', 'Overcast')
      };
    case 45:
    case 48:
      return {
        icon: '🌫️',
        text: c('Туман', 'Туман', 'Fog')
      };
    case 51:
    case 53:
    case 55:
      return {
        icon: '🌧️',
        text: c('Мряка', 'Морось', 'Drizzle')
      };
    case 61:
    case 63:
    case 65:
      return {
        icon: '🌧️',
        text: c('Дощ', 'Дождь', 'Rain')
      };
    case 80:
    case 81:
    case 82:
      return {
        icon: '🌦️',
        text: c('Злива', 'Ливень', 'Rain showers')
      };
    case 95:
    case 96:
    case 99:
      return {
        icon: '⛈️',
        text: c('Гроза', 'Гроза', 'Thunderstorm')
      };
    default:
      return {
        icon: '⛅',
        text: c('Мінлива хмарність', 'Переменная облачность', 'Partly cloudy')
      };
  }
}

export default function WeatherBlock() {
  const { locale } = useLocale();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchWeather() {
      try {
        const res = await contentApi.weather();
        if (active) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        console.error('[WeatherBlock] Error loading weather:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchWeather();
    return () => {
      active = false;
    };
  }, []);

  const t = translations[locale] || translations['ua'];

  if (loading) {
    return (
      <section className="content-section weather-section loading">
        <div className="weather-loader-container">
          <div className="weather-spinner"></div>
          <span>{t.loading}</span>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return null; // Gracefully hide the block if there is a persistent API failure
  }

  const weatherInfo = getWeatherInfo(data.current.weatherCode, data.current.isDay !== 0);
  const weatherText = weatherInfo.text[locale] || weatherInfo.text['ua'];
  const windDirectionText = getWindDirection(data.current.windDir, locale);

  // Prepare secondary items for running ticker
  const tickerItems = [];
  
  if (data.current.windSpeed !== null) {
    tickerItems.push(
      `💨 ${t.wind}: ${Math.round(data.current.windSpeed)} ${t.kmh}${windDirectionText ? ` (${windDirectionText})` : ''}`
    );
  }
  if (data.current.windGusts !== null) {
    tickerItems.push(
      `🌪️ ${t.windGusts}: ${Math.round(data.current.windGusts)} ${t.kmh}`
    );
  }
  if (data.current.humidity !== null) {
    tickerItems.push(
      `💧 ${t.humidity}: ${data.current.humidity}%`
    );
  }
  if (data.daily.precipProb !== null) {
    tickerItems.push(
      `🌧️ ${t.precipProb}: ${data.daily.precipProb}%`
    );
  }
  if (data.daily.uvMax !== null) {
    tickerItems.push(
      `☀️ ${t.uvIndex}: ${Math.round(data.daily.uvMax)}`
    );
  }
  if (data.current.wavePeriod !== null) {
    tickerItems.push(
      `🌊 Період хвилі: ${data.current.wavePeriod} с`
    );
  }
  if (data.daily.sunrise || data.daily.sunset) {
    const sunParts = [];
    if (data.daily.sunrise) sunParts.push(`🌅 ${t.sunrise} ${formatTime(data.daily.sunrise)}`);
    if (data.daily.sunset) sunParts.push(`🌇 ${t.sunset} ${formatTime(data.daily.sunset)}`);
    tickerItems.push(sunParts.join(' · '));
  }

  return (
    <section className="content-section weather-section">
      <div className="section-header">
        <h2>{t.title}</h2>
        <span className="weather-updated">
          Open-Meteo · {t.updated} {formatTime(data.fetchedAt)}
        </span>
      </div>

      <div className="weather-container">
        {/* Air Weather Card */}
        <div className="weather-card air-card">
          <div className="weather-card-title">{t.airTitle}</div>
          <div className="weather-main-row">
            <div className="weather-icon">{weatherInfo.icon}</div>
            <div className="weather-temp-block">
              <div className="weather-temp">{formatTemp(data.current.tempAir)}</div>
              <div className="weather-feels">
                {t.feelsLike} {formatTemp(data.current.tempFeels)}
              </div>
            </div>
          </div>
          <div className="weather-status-text">{weatherText}</div>
        </div>

        {/* Sea Weather Card */}
        <div className="weather-card sea-card">
          <div className="weather-card-title">{t.seaTitle}</div>
          <div className="weather-main-row">
            <div className="weather-icon">🌊</div>
            <div className="weather-temp-block">
              <div className="weather-temp">{formatTemp(data.current.tempWater)}</div>
              <div className="weather-feels">{t.approxWater}</div>
            </div>
          </div>
          <div className="weather-status-text">
            {t.wave} {data.current.waveHeight !== null ? `${data.current.waveHeight} ${t.m}` : `-- ${t.m}`}
          </div>
        </div>
      </div>

      {tickerItems.length > 0 && (
        <div className="weather-ticker-wrap">
          <div className="weather-ticker">
            <div className="weather-ticker-items">
              {tickerItems.map((item, idx) => (
                <span key={idx} className="weather-ticker-item">
                  {item}
                </span>
              ))}
            </div>
            {/* Duplicate for seamless infinite loop */}
            <div className="weather-ticker-items" aria-hidden="true">
              {tickerItems.map((item, idx) => (
                <span key={`dup-${idx}`} className="weather-ticker-item">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
