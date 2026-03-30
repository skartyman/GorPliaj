export interface MapTable {
  id: number;
  zoneId?: number;
  code: string;
  name: string;
  seatsMin: number;
  seatsMax: number;
  x: number;
  y: number;
  status: 'free' | 'busy' | 'held';
}

export interface MapZone {
  id: number;
  name: string;
  tables: MapTable[];
}

export interface PublicMapData {
  id: number;
  name: string;
  zones: MapZone[];
}
