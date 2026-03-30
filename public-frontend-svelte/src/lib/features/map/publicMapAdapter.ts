import { mapApi } from '$lib/api/map';
import type { PublicMapData } from '$lib/features/map/types';

interface ApiTable {
  id: number;
  code?: string;
  name?: string;
  seatsMin?: number;
  seatsMax?: number;
  x: number;
  y: number;
  zoneId?: number;
}

interface ApiZone {
  id: number;
  name: string;
  tables: ApiTable[];
}

interface ApiMap {
  id: number;
  name: string;
  zones: ApiZone[];
}

interface MapLoadParams {
  date?: string;
  timeFrom?: string;
}

function toPublicMap(data: ApiMap): PublicMapData {
  return {
    id: data.id,
    name: data.name,
    zones: (data.zones || []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      tables: (zone.tables || []).map((table, index) => ({
        id: table.id,
        zoneId: zone.id,
        code: table.code || `T-${table.id}`,
        name: table.name || `Table ${index + 1}`,
        seatsMin: table.seatsMin || 2,
        seatsMax: table.seatsMax || 4,
        x: table.x,
        y: table.y,
        status: 'free'
      }))
    }))
  };
}

export async function getPublicMapData(params: MapLoadParams = {}) {
  const map = await mapApi.defaultMap<ApiMap>();
  const normalizedMap = toPublicMap(map);

  if (params.date && params.timeFrom) {
    const availability = await mapApi.availability<{
      busyTableIds: number[];
      heldTableIds: number[];
    }>(normalizedMap.id, params.date, params.timeFrom);

    const busy = new Set(availability.busyTableIds || []);
    const held = new Set(availability.heldTableIds || []);

    normalizedMap.zones = normalizedMap.zones.map((zone) => ({
      ...zone,
      tables: zone.tables.map((table) => ({
        ...table,
        status: busy.has(table.id) ? 'busy' : held.has(table.id) ? 'held' : 'free'
      }))
    }));
  }

  return { map: normalizedMap, source: 'api' as const };
}
