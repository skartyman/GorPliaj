export interface MapTable {
  id: number;
  zoneId?: number;
  code: string;
  name: string;
  seatsMin: number;
  seatsMax: number;
  x: number;
  y: number;
  isBookable: boolean;
  isActive: boolean;
  shape: string;
  status: 'free' | 'busy' | 'held' | 'unavailable';
}

export interface MapZone {
  id: number;
  name: string;
  tables: MapTable[];
}

export interface MapObject {
  id: number;
  type: string;
  label: string;
  tableId: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  styleJson?: string | null;
}

export interface PublicMapData {
  id: number;
  name: string;
  width: number;
  height: number;
  backgroundColor?: string | null;
  backgroundImage?: string | null;
  zones: MapZone[];
  objects: MapObject[];
}
