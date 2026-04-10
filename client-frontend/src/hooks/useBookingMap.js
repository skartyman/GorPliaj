import { useEffect, useState, useRef } from 'react';

const zoomSteps = [1, 1.25, 1.5, 2, 2.5];

export function useBookingMap() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [availability, setAvailability] = useState({ busyTableIds: [], heldTableIds: [], freeTableIds: [] });
  const [currentZoomIndex, setCurrentZoomIndex] = useState(0);
  const mapRef = useRef(null);
  const shellRef = useRef(null);

  useEffect(() => {
    async function fetchMap() {
      try {
        const response = await fetch('/api/maps/1');
        if (!response.ok) throw new Error('Failed to fetch map');
        const data = await response.json();
        setMapData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMap();
  }, []);

  const fetchAvailability = async (date, timeFrom, mapId) => {
    if (!date || !timeFrom || !mapId) return;

    try {
      const query = new URLSearchParams({ date, timeFrom }).toString();
      const response = await fetch(`/api/maps/${mapId}/availability?${query}`);
      if (!response.ok) throw new Error('Availability request failed');
      const data = await response.json();
      setAvailability({
        busyTableIds: Array.isArray(data.busyTableIds) ? data.busyTableIds : [],
        heldTableIds: Array.isArray(data.heldTableIds) ? data.heldTableIds : [],
        freeTableIds: Array.isArray(data.freeTableIds) ? data.freeTableIds : []
      });
    } catch (err) {
      console.error('Availability error:', err);
    }
  };

  const isTableBusy = (tableId) => availability.busyTableIds.includes(tableId);
  const isTableHeld = (tableId) => availability.heldTableIds.includes(tableId);
  const isTableFree = (tableId) => availability.freeTableIds.includes(tableId) || (!isTableBusy(tableId) && !isTableHeld(tableId));

  const zoomIn = () => setCurrentZoomIndex((prev) => Math.min(prev + 1, zoomSteps.length - 1));
  const zoomOut = () => setCurrentZoomIndex((prev) => Math.max(prev - 1, 0));
  const zoomReset = () => setCurrentZoomIndex(0);
  const getZoomScale = () => zoomSteps[currentZoomIndex];

  const panMap = (deltaX = 0, deltaY = 0) => {
    if (shellRef.current) {
      shellRef.current.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' });
    }
  };

  return {
    mapData,
    loading,
    error,
    selectedTable,
    setSelectedTable,
    availability,
    fetchAvailability,
    isTableBusy,
    isTableHeld,
    isTableFree,
    currentZoomIndex,
    zoomIn,
    zoomOut,
    zoomReset,
    getZoomScale,
    panMap,
    mapRef,
    shellRef
  };
}
