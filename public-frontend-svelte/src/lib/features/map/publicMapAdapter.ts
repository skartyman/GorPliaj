import { mapApi } from '$lib/api/map';
import type { PublicMapData } from '$lib/features/map/types';

interface ApiTable {
  id: number;
  code?: string;
  name?: string;
  seatsMin?: number;
  seatsMax?: number;
  x?: number;
  y?: number;
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
  width?: number;
  height?: number;
  zones?: ApiZone[];
}

interface ApiObject {
  id: number;
  type?: string;
  tableId?: number | null;
  x?: number;
  y?: number;
}

interface ApiDefaultMapResponse {
  map: ApiMap;
  zones?: ApiZone[];
  tables?: ApiTable[];
  objects?: ApiObject[];
}

interface MapLoadParams {
  date?: string;
  timeFrom?: string;
}

function toPercentCoordinate(value: number | undefined, total: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (Number.isFinite(total) && total && value! > 1) {
    return (value! / total) * 100;
  }

  return value!;
}

function toPublicMap(data: ApiMap | ApiDefaultMapResponse): PublicMapData {
  const mapData = 'map' in data ? data.map : data;
  const zones = ('zones' in data ? data.zones : mapData.zones) || [];
  const rootTables = 'tables' in data ? data.tables || [] : [];
  const objects = 'objects' in data ? data.objects || [] : [];

  const tableObjectById = new Map(
    objects
      .filter((object) => object.tableId && (object.type === 'TABLE' || !object.type))
      .map((object) => [object.tableId as number, object])
  );

  const tablesByZone = new Map<number, ApiTable[]>();
  for (const table of rootTables) {
    if (!table.zoneId) continue;
    const current = tablesByZone.get(table.zoneId) || [];
    current.push(table);
    tablesByZone.set(table.zoneId, current);
  }

  return {
    id: mapData.id,
    name: mapData.name,
    zones: zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      tables: (zone.tables?.length ? zone.tables : tablesByZone.get(zone.id) || []).map((table, index) => {
        const mapObject = tableObjectById.get(table.id);

        return {
        id: table.id,
        zoneId: zone.id,
        code: table.code || `T-${table.id}`,
        name: table.name || `Table ${index + 1}`,
        seatsMin: table.seatsMin || 2,
        seatsMax: table.seatsMax || 4,
        x: toPercentCoordinate(table.x ?? mapObject?.x, mapData.width),
        y: toPercentCoordinate(table.y ?? mapObject?.y, mapData.height),
        status: 'free'
      };
      })
    }))
  };
}

export async function getPublicMapData(params: MapLoadParams = {}) {
  const map = await mapApi.defaultMap<ApiMap>();
  const normalizedMap = toPublicMap(map);

  if (params.date && params.timeFrom) {
    try {
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
    } catch {
      // If availability request fails, keep default "free" status instead of crashing booking/map pages.
    }
  }

  return { map: normalizedMap, source: 'api' as const };
}
