export interface MapTable {
  id: number;
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

export const mockMapData: PublicMapData = {
  id: 1,
  name: 'Основна карта GorPliaj',
  zones: [
    {
      id: 101,
      name: 'Тераса',
      tables: [
        { id: 1, code: 'T1', name: 'Тераса 1', seatsMin: 2, seatsMax: 4, x: 10, y: 20, status: 'free' },
        { id: 2, code: 'T2', name: 'Тераса 2', seatsMin: 2, seatsMax: 6, x: 36, y: 18, status: 'busy' }
      ]
    },
    {
      id: 102,
      name: 'Пляжна лінія',
      tables: [
        { id: 3, code: 'B1', name: 'Пляж 1', seatsMin: 2, seatsMax: 4, x: 20, y: 62, status: 'held' },
        { id: 4, code: 'B2', name: 'Пляж 2', seatsMin: 4, seatsMax: 8, x: 46, y: 66, status: 'free' }
      ]
    }
  ]
};
