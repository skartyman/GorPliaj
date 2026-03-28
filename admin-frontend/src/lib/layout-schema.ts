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
    name: 'Day · Beach + Restaurant',
    code: 'day_beach_restaurant',
    description: 'Default day layout with beach and main restaurant zones.',
    enabledZoneIds: ['zone_beach', 'zone_restaurant', 'zone_pier'],
    theme: 'day',
    defaultTimeRange: { from: '10:00', to: '18:00' },
    seasonality: 'summer'
  },
  {
    id: 'layout_night',
    name: 'Night · Restaurant + Event',
    code: 'night_restaurant_event',
    description: 'Night event logic with terrace and expanded pier activity.',
    enabledZoneIds: ['zone_restaurant', 'zone_terrace', 'zone_event', 'zone_pier'],
    theme: 'night',
    defaultTimeRange: { from: '18:00', to: '02:00' },
    seasonality: 'all'
  },
  {
    id: 'layout_winter',
    name: 'Winter · Indoor Restaurant',
    code: 'winter_restaurant',
    description: 'Indoor winter restaurant mode with fireplace room.',
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
