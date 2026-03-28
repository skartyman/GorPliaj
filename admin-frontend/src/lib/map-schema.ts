import { STARTER_LAYOUT_MODES, type LayoutMode, type LayoutVisibility } from './layout-schema';
import type { BookingKind } from './booking-schema';
import type { ObjectVisualConfig } from './editor-assets';
import { getDefaultVisualConfigForObject } from './editor-assets';

export type TerritoryObjectType =
  | 'rect'
  | 'polygon'
  | 'line'
  | 'text'
  | 'deck'
  | 'pathway'
  | 'stairs'
  | 'sand'
  | 'sea'
  | 'pier'
  | 'building'
  | 'winter_restaurant'
  | 'room'
  | 'bar'
  | 'stage'
  | 'cashier'
  | 'wc'
  | 'entrance'
  | 'decor'
  | 'plant';

export type ZoneType = 'restaurant' | 'terrace' | 'beach' | 'pier' | 'indoor' | 'event' | 'service';

export interface BaseRenderableObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  label?: string;
  zoneId?: string;
  visibleInLayoutModes: LayoutVisibility;
  visual?: ObjectVisualConfig;
}

export interface TerritoryObject extends BaseRenderableObject {
  type: TerritoryObjectType;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface BookableObject extends BaseRenderableObject {
  objectType: 'round_table' | 'rect_table' | 'sofa' | 'lounger_bed' | 'bungalow' | 'hookah_table' | 'vip_zone' | 'ticket_zone' | 'pier_bed';
  bookingKind: BookingKind;
  capacityMin: number;
  capacityMax: number;
  depositType?: 'fixed' | 'percent';
  depositValue?: number;
  minSpend?: number;
  combinable: boolean;
  combineGroup?: string;
  tableCode?: string;
  seasonalAvailability?: string[];
  eventAvailability?: string[];
}

export interface Zone {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked?: boolean;
  visibleInLayoutModes: LayoutVisibility;
  zoneType?: ZoneType;
}

export interface BaseMapDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  version: number;
  status?: 'draft' | 'published';
  territoryObjects: TerritoryObject[];
  bookableObjects: BookableObject[];
  zones: Zone[];
  layoutModes: LayoutMode[];
  metadata?: Record<string, unknown>;
}

export const MAP_SCHEMA_VERSION = 1;

export function createStarterDocument(): BaseMapDocument {
  return {
    id: 'gorpliaj-base-territory',
    name: 'GorPliaj Base Territory',
    width: 1800,
    height: 1000,
    backgroundColor: '#111827',
    version: MAP_SCHEMA_VERSION,
    status: 'draft',
    zones: [
      { id: 'zone_beach', name: 'Beach', color: '#1f2937', visible: true, visibleInLayoutModes: 'all', zoneType: 'beach' },
      { id: 'zone_restaurant', name: 'Restaurant', color: '#374151', visible: true, visibleInLayoutModes: 'all', zoneType: 'restaurant' },
      { id: 'zone_terrace', name: 'Terrace', color: '#334155', visible: true, visibleInLayoutModes: ['night_restaurant_event'], zoneType: 'terrace' },
      { id: 'zone_pier', name: 'Pier', color: '#0f172a', visible: true, visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'], zoneType: 'pier' },
      { id: 'zone_event', name: 'Event Zone', color: '#1e293b', visible: true, visibleInLayoutModes: ['night_restaurant_event'], zoneType: 'event' },
      { id: 'zone_winter', name: 'Winter Restaurant', color: '#312e81', visible: true, visibleInLayoutModes: ['winter_restaurant'], zoneType: 'indoor' },
      { id: 'zone_indoor', name: 'Indoor Hall', color: '#27272a', visible: true, visibleInLayoutModes: ['winter_restaurant'], zoneType: 'indoor' },
      { id: 'zone_service', name: 'Service', color: '#3f3f46', visible: true, visibleInLayoutModes: 'all', zoneType: 'service' }
    ],
    layoutModes: STARTER_LAYOUT_MODES,
    territoryObjects: [
      {
        id: 'territory_sea',
        type: 'sea',
        name: 'Sea',
        x: 0,
        y: 0,
        width: 1800,
        height: 300,
        rotation: 0,
        zIndex: 1,
        locked: false,
        hidden: false,
        fill: '#1d4ed8',
        stroke: '#1e40af',
        strokeWidth: 1,
        visibleInLayoutModes: 'all',
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'sea' })
      },
      {
        id: 'territory_sand',
        type: 'sand',
        name: 'Beach Sand',
        x: 0,
        y: 300,
        width: 1800,
        height: 430,
        rotation: 0,
        zIndex: 2,
        locked: false,
        hidden: false,
        fill: '#a16207',
        stroke: '#78350f',
        strokeWidth: 1,
        zoneId: 'zone_beach',
        visibleInLayoutModes: 'all',
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'sand' })
      },
      {
        id: 'territory_pier',
        type: 'pier',
        name: 'Pier',
        x: 1240,
        y: 160,
        width: 360,
        height: 120,
        rotation: 0,
        zIndex: 3,
        locked: false,
        hidden: false,
        fill: '#7c2d12',
        stroke: '#78350f',
        strokeWidth: 1,
        zoneId: 'zone_pier',
        visibleInLayoutModes: 'all',
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'pier' })
      }
    ],
    bookableObjects: [
      {
        id: 'bookable_1',
        objectType: 'round_table',
        bookingKind: 'restaurant_table',
        name: 'Restaurant Table R1',
        tableCode: 'R1',
        x: 900,
        y: 580,
        width: 80,
        height: 80,
        rotation: 0,
        zIndex: 20,
        locked: false,
        hidden: false,
        visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'],
        capacityMin: 2,
        capacityMax: 4,
        minSpend: 100,
        combinable: false,
        zoneId: 'zone_restaurant',
        visual: getDefaultVisualConfigForObject({ kind: 'bookable', objectType: 'round_table' })
      }
    ],
    metadata: { currency: 'USD' }
  };
}
