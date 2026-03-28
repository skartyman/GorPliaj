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
    name: 'GorPliaj Demo Map',
    width: 1800,
    height: 1000,
    backgroundColor: '#0f172a',
    version: MAP_SCHEMA_VERSION,
    status: 'draft',
    zones: [
      { id: 'zone_beach', name: 'Пляж', color: '#1f2937', visible: true, visibleInLayoutModes: 'all', zoneType: 'beach' },
      { id: 'zone_restaurant', name: 'Ресторан', color: '#374151', visible: true, visibleInLayoutModes: 'all', zoneType: 'restaurant' },
      { id: 'zone_terrace', name: 'Терраса', color: '#334155', visible: true, visibleInLayoutModes: ['night_restaurant_event'], zoneType: 'terrace' },
      { id: 'zone_pier', name: 'Пирс', color: '#0f172a', visible: true, visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'], zoneType: 'pier' },
      { id: 'zone_event', name: 'Событие', color: '#1e293b', visible: true, visibleInLayoutModes: ['night_restaurant_event'], zoneType: 'event' },
      { id: 'zone_winter', name: 'Зимний ресторан', color: '#312e81', visible: true, visibleInLayoutModes: ['winter_restaurant'], zoneType: 'indoor' },
      { id: 'zone_indoor', name: 'Внутренний зал', color: '#27272a', visible: true, visibleInLayoutModes: ['winter_restaurant'], zoneType: 'indoor' },
      { id: 'zone_service', name: 'Сервис', color: '#3f3f46', visible: true, visibleInLayoutModes: 'all', zoneType: 'service' }
    ],
    layoutModes: STARTER_LAYOUT_MODES,
    territoryObjects: [
      {
        id: 'territory_sea',
        type: 'sea',
        name: 'Море',
        x: 0,
        y: 0,
        width: 1800,
        height: 360,
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
        name: 'Песок',
        x: 0,
        y: 320,
        width: 1800,
        height: 460,
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
        id: 'territory_deck',
        type: 'deck',
        name: 'Настил',
        x: 520,
        y: 650,
        width: 760,
        height: 200,
        rotation: 0,
        zIndex: 3,
        locked: false,
        hidden: false,
        fill: '#7c2d12',
        stroke: '#78350f',
        strokeWidth: 1,
        zoneId: 'zone_restaurant',
        visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'],
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'deck' })
      },
      {
        id: 'territory_pathway',
        type: 'pathway',
        name: 'Дорожка',
        x: 760,
        y: 340,
        width: 280,
        height: 320,
        rotation: 0,
        zIndex: 4,
        locked: false,
        hidden: false,
        fill: '#64748b',
        stroke: '#475569',
        strokeWidth: 1,
        visibleInLayoutModes: 'all',
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'pathway' })
      },
      {
        id: 'territory_pier',
        type: 'pier',
        name: 'Пирс',
        x: 1240,
        y: 180,
        width: 420,
        height: 140,
        rotation: 0,
        zIndex: 5,
        locked: false,
        hidden: false,
        fill: '#78350f',
        stroke: '#92400e',
        strokeWidth: 1,
        zoneId: 'zone_pier',
        visibleInLayoutModes: 'all',
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'pier' })
      },
      {
        id: 'territory_building',
        type: 'building',
        name: 'Главный корпус',
        x: 560,
        y: 790,
        width: 360,
        height: 180,
        rotation: 0,
        zIndex: 6,
        locked: false,
        hidden: false,
        fill: '#1f2937',
        stroke: '#475569',
        strokeWidth: 1,
        zoneId: 'zone_restaurant',
        visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'],
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'building' })
      },
      {
        id: 'territory_winter_restaurant',
        type: 'winter_restaurant',
        name: 'Зимний ресторан',
        x: 980,
        y: 785,
        width: 280,
        height: 180,
        rotation: 0,
        zIndex: 7,
        locked: false,
        hidden: false,
        fill: '#312e81',
        stroke: '#4338ca',
        strokeWidth: 1,
        zoneId: 'zone_winter',
        visibleInLayoutModes: ['winter_restaurant'],
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'winter_restaurant' })
      },
      {
        id: 'territory_bar',
        type: 'bar',
        name: 'Бар',
        x: 1090,
        y: 690,
        width: 170,
        height: 95,
        rotation: 0,
        zIndex: 8,
        locked: false,
        hidden: false,
        fill: '#7c3aed',
        stroke: '#6d28d9',
        strokeWidth: 1,
        zoneId: 'zone_restaurant',
        visibleInLayoutModes: 'all',
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'bar' })
      },
      {
        id: 'territory_stage',
        type: 'stage',
        name: 'Сцена',
        x: 1320,
        y: 620,
        width: 220,
        height: 120,
        rotation: 0,
        zIndex: 9,
        locked: false,
        hidden: false,
        fill: '#7f1d1d',
        stroke: '#b91c1c',
        strokeWidth: 1,
        zoneId: 'zone_event',
        visibleInLayoutModes: ['night_restaurant_event'],
        visual: getDefaultVisualConfigForObject({ kind: 'territory', type: 'stage' })
      }
    ],
    bookableObjects: [
      {
        id: 'bookable_r1',
        objectType: 'round_table',
        bookingKind: 'restaurant_table',
        name: 'Стол R1',
        tableCode: 'R1',
        x: 640,
        y: 700,
        width: 86,
        height: 86,
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
      },
      {
        id: 'bookable_r2',
        objectType: 'rect_table',
        bookingKind: 'terrace_table',
        name: 'Стол T1',
        tableCode: 'T1',
        x: 760,
        y: 710,
        width: 110,
        height: 78,
        rotation: 0,
        zIndex: 21,
        locked: false,
        hidden: false,
        visibleInLayoutModes: ['night_restaurant_event'],
        capacityMin: 4,
        capacityMax: 6,
        minSpend: 120,
        combinable: true,
        zoneId: 'zone_terrace',
        visual: getDefaultVisualConfigForObject({ kind: 'bookable', objectType: 'rect_table' })
      },
      {
        id: 'bookable_l1',
        objectType: 'lounger_bed',
        bookingKind: 'lounger_bed',
        name: 'Лежак L1',
        tableCode: 'L1',
        x: 230,
        y: 530,
        width: 146,
        height: 66,
        rotation: -8,
        zIndex: 22,
        locked: false,
        hidden: false,
        visibleInLayoutModes: ['day_beach_restaurant'],
        capacityMin: 1,
        capacityMax: 2,
        minSpend: 40,
        combinable: false,
        zoneId: 'zone_beach',
        visual: getDefaultVisualConfigForObject({ kind: 'bookable', objectType: 'lounger_bed' })
      },
      {
        id: 'bookable_vip1',
        objectType: 'vip_zone',
        bookingKind: 'vip_zone',
        name: 'VIP A',
        tableCode: 'VIP-A',
        x: 1210,
        y: 700,
        width: 220,
        height: 112,
        rotation: 0,
        zIndex: 23,
        locked: false,
        hidden: false,
        visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'],
        capacityMin: 4,
        capacityMax: 8,
        minSpend: 300,
        combinable: false,
        zoneId: 'zone_restaurant',
        visual: getDefaultVisualConfigForObject({ kind: 'bookable', objectType: 'vip_zone' })
      },
      {
        id: 'bookable_pier1',
        objectType: 'pier_bed',
        bookingKind: 'pier_spot',
        name: 'Пирс P1',
        tableCode: 'P1',
        x: 1340,
        y: 210,
        width: 140,
        height: 64,
        rotation: 0,
        zIndex: 24,
        locked: false,
        hidden: false,
        visibleInLayoutModes: ['day_beach_restaurant', 'night_restaurant_event'],
        capacityMin: 2,
        capacityMax: 2,
        minSpend: 160,
        combinable: false,
        zoneId: 'zone_pier',
        visual: getDefaultVisualConfigForObject({ kind: 'bookable', objectType: 'pier_bed' })
      }
    ],
    metadata: { currency: 'USD' }
  };
}
