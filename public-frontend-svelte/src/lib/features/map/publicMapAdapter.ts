import { mapApi } from '$lib/api/map';
import { mockMapData, type PublicMapData } from '$lib/features/booking/mockMap';

interface ApiTable {
  id: number;
  code?: string;
  name?: string;
  seatsMin?: number;
  seatsMax?: number;
  x: number;
  y: number;
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

function toPublicMap(data: ApiMap): PublicMapData {
  return {
    id: data.id,
    name: data.name,
    zones: (data.zones || []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      tables: (zone.tables || []).map((table, index) => ({
        id: table.id,
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

export async function getPublicMapData() {
  try {
    const map = await mapApi.defaultMap<ApiMap>();
    return { map: toPublicMap(map), source: 'api' as const };
  } catch {
    return { map: mockMapData, source: 'mock' as const };
  }
}
