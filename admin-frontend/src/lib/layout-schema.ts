export type LayoutVisibility = 'all' | string[];

export interface LayoutMode {
  id: string;
  name: string;
  code: string;
  description?: string;
  enabledZoneIds: string[];
  enabledBookableObjectIds?: string[];
  theme?: 'day' | 'night' | 'winter' | 'custom';
  defaultTimeRange?: { from: string; to: string };
  seasonality?: string;
}

export const STARTER_LAYOUT_MODES: LayoutMode[] = [
  {
    id: 'layout_day',
    name: 'День · Пляж + Ресторан',
    code: 'day_beach_restaurant',
    description: 'Дневной режим: пляж, ресторан и пирс открыты для гостей.',
    enabledZoneIds: ['zone_beach', 'zone_restaurant', 'zone_pier'],
    theme: 'day',
    defaultTimeRange: { from: '10:00', to: '18:00' },
    seasonality: 'summer'
  },
  {
    id: 'layout_night',
    name: 'Вечер · Ресторан + Событие',
    code: 'night_restaurant_event',
    description: 'Вечерний режим с террасой, сценой и активной event-зоной.',
    enabledZoneIds: ['zone_restaurant', 'zone_terrace', 'zone_event', 'zone_pier'],
    theme: 'night',
    defaultTimeRange: { from: '18:00', to: '02:00' },
    seasonality: 'all'
  },
  {
    id: 'layout_winter',
    name: 'Зима · Внутренний ресторан',
    code: 'winter_restaurant',
    description: 'Зимний режим с фокусом на внутренние и сервисные зоны.',
    enabledZoneIds: ['zone_winter', 'zone_indoor', 'zone_service'],
    theme: 'winter',
    defaultTimeRange: { from: '12:00', to: '23:00' },
    seasonality: 'winter'
  }
];

export function isVisibleInLayout(layoutCode: string, visibleInLayoutModes: LayoutVisibility): boolean {
  if (visibleInLayoutModes === 'all') return true;
  return Array.isArray(visibleInLayoutModes) ? visibleInLayoutModes.includes(layoutCode) : false;
}
