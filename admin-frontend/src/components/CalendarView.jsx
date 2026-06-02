import { useMemo, useState } from 'react';
import { useAdminI18n } from '../lib/i18n';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function useDayNames(locale) {
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const days = [];
    for (let i = 1; i <= 7; i++) {
      days.push(formatter.format(new Date(2021, 0, i + 3)));
    }
    return days;
  }, [locale]);
}

function useMonthNames(locale) {
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(formatter.format(new Date(2021, i, 1)));
    }
    return months;
  }, [locale]);
}

function useMonthGrid(year, month) {
  return useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [year, month]);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarView({ items = [], onDateClick }) {
  const { locale } = useAdminI18n();
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMonthGrid(year, month);
  const dayNames = useDayNames(locale);
  const monthNames = useMonthNames(locale);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of items) {
      const d = item.date instanceof Date ? item.date : new Date(item.date);
      if (!isNaN(d.getTime())) {
        const key = dateKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(item);
      }
    }
    return map;
  }, [items]);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function handleDayClick(date) {
    const key = dateKey(date);
    setSelectedKey(key === selectedKey ? '' : key);
    onDateClick?.(date);
  }

  const selectedItems = selectedKey ? itemsByDate[selectedKey] || [] : [];

  return (
    <div className="calendar-view">
      <div className="calendar-head">
        <button type="button" className="icon-btn" onClick={prevMonth} aria-label={locale === 'uk-UA' ? 'Попередній місяць' : locale === 'ru-RU' ? 'Предыдущий месяц' : 'Previous month'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h3 className="calendar-title">{monthNames[month]} {year}</h3>
        <button type="button" className="icon-btn" onClick={nextMonth} aria-label={locale === 'uk-UA' ? 'Наступний місяць' : locale === 'ru-RU' ? 'Следующий месяц' : 'Next month'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div className="calendar-grid">
        {dayNames.map((name) => (
          <div key={name} className="calendar-day-header">{name}</div>
        ))}
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="calendar-day empty" />;

          const key = dateKey(date);
          const dayItems = itemsByDate[key] || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;

          return (
            <div
              key={key}
              className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayItems.length > 0 ? 'has-items' : ''}`}
              onClick={() => handleDayClick(date)}
            >
              <span className="calendar-day-num">{date.getDate()}</span>
              {dayItems.length > 0 ? (
                <div className="calendar-day-dots">
                  {dayItems.slice(0, 3).map((item, i) => (
                    <span key={i} className={`calendar-dot ${item.color || ''}`} title={item.title || ''} />
                  ))}
                  {dayItems.length > 3 ? <span className="calendar-dot-more">+{dayItems.length - 3}</span> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedItems.length > 0 ? (
        <div className="calendar-detail">
          <h4 className="calendar-detail-title">
            Items for {selectedKey}
          </h4>
          <div className="calendar-detail-list">
            {selectedItems.map((item, i) => (
              <div key={i} className="calendar-detail-item">
                {item.renderItem ? item.renderItem() : <span>{item.title || 'Item'}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : selectedKey ? (
        <div className="calendar-detail">
          <p className="muted">No items for this date.</p>
        </div>
      ) : null}
    </div>
  );
}
