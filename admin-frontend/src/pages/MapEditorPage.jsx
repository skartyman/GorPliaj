import { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const STATIC_TYPE_ACCENTS = {
  BAR: 'bar',
  STAGE: 'stage',
  ENTRANCE: 'entrance',
  WC: 'wc',
  LABEL: 'label',
  DECOR: 'decor',
  STAIRS: 'stairs',
  PATH: 'path'
};

const CREATION_ACTIONS = ['TABLE', 'BAR', 'STAGE', 'ENTRANCE', 'WC', 'STAIRS', 'PATH', 'DECOR', 'LABEL'];
const SURFACE_PRESETS = [
  { key: 'WOOD_PATH', label: 'Wooden path', objectType: 'CUSTOM', objectLabel: 'Wooden path', width: 240, height: 56 },
  { key: 'DECK', label: 'Wooden deck', objectType: 'CUSTOM', objectLabel: 'Deck', width: 260, height: 120 },
  { key: 'SAND', label: 'Sand area', objectType: 'CUSTOM', objectLabel: 'Sand', width: 320, height: 160 },
  { key: 'SEA', label: 'Sea area', objectType: 'CUSTOM', objectLabel: 'Sea', width: 360, height: 180 }
];
const MAP_VARIANT_PRESETS = [
  { key: 'DAY', name: 'Day seating', slugPrefix: 'day-seating', description: 'Main daytime seating map' },
  { key: 'NIGHT', name: 'Night seating', slugPrefix: 'night-seating', description: 'Evening/night layout map' },
  { key: 'EVENT', name: 'Event layout', slugPrefix: 'event-layout', description: 'Event-focused layout' },
  { key: 'CONCERT', name: 'Concert seating', slugPrefix: 'concert-seating', description: 'Concert with seated zones' }
];
const PROPERTY_FIELDS = [
  { key: 'label', type: 'text', step: null },
  { key: 'x', type: 'number', step: 1 },
  { key: 'y', type: 'number', step: 1 },
  { key: 'width', type: 'number', step: 1 },
  { key: 'height', type: 'number', step: 1 },
  { key: 'rotation', type: 'number', step: 1 },
  { key: 'zIndex', type: 'number', step: 1 }
];
const CREATION_PRESETS = {
  TABLE: { width: 108, height: 72 },
  BAR: { width: 160, height: 64 },
  STAGE: { width: 200, height: 120 },
  ENTRANCE: { width: 110, height: 52 },
  WC: { width: 96, height: 72 },
  STAIRS: { width: 120, height: 84 },
  PATH: { width: 220, height: 44 },
  DECOR: { width: 120, height: 88 },
  LABEL: { width: 180, height: 60 }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundCoordinate(value) {
  return Math.round(Number(value) || 0);
}

function normalizeMap(map) {
  if (!map) {
    return null;
  }

  return {
    ...map,
    backgroundImage: String(map.backgroundImage || '').trim(),
    backgroundColor: String(map.backgroundColor || '').trim() || '#f8fafc'
  };
}

function normalizeObject(object, map) {
  const width = Math.max(roundCoordinate(object.width), 24);
  const height = Math.max(roundCoordinate(object.height), 24);
  const maxX = Math.max((map?.width || 0) - width, 0);
  const maxY = Math.max((map?.height || 0) - height, 0);

  return {
    ...object,
    label: object.label || '',
    tableId: Number.isInteger(Number(object.tableId)) && Number(object.tableId) > 0 ? Number(object.tableId) : null,
    x: clamp(roundCoordinate(object.x), 0, maxX),
    y: clamp(roundCoordinate(object.y), 0, maxY),
    width,
    height,
    rotation: roundCoordinate(object.rotation),
    zIndex: roundCoordinate(object.zIndex),
    isActive: Boolean(object.isActive)
  };
}

function buildEditorState(payload) {
  const map = normalizeMap(payload.map);

  return {
    map,
    zones: payload.zones || [],
    tables: (payload.tables || []).map((table) => ({
      ...table,
      photoUrl: String(table.photoUrl || '').trim()
    })),
    objects: (payload.objects || []).map((object) => normalizeObject(object, map))
  };
}

function getObjectAccent(object) {
  if (object.type === 'TABLE') {
    return 'table';
  }

  const normalizedLabel = String(object.label || '').toLowerCase();
  if (/(sand|пісок|песок)/i.test(normalizedLabel)) return 'sand';
  if (/(sea|море)/i.test(normalizedLabel)) return 'sea';
  if (/(deck|настил)/i.test(normalizedLabel)) return 'deck';
  if (/(wooden path|дерев'яна доріжка|деревянная дорожка)/i.test(normalizedLabel)) return 'path';

  return STATIC_TYPE_ACCENTS[object.type] || 'static';
}

function getObjectDisplayName(object, tableMap, t) {
  if (object.type === 'TABLE') {
    const table = object.tableId ? tableMap.get(object.tableId) : null;
    return table?.code || table?.name || object.label || t('mapEditor.objectType.TABLE');
  }

  return object.label || t(`mapEditor.objectType.${object.type}`);
}

function getNextSelectionId(nextObjects, preferredId = null) {
  if (!nextObjects.length) {
    return null;
  }

  if (preferredId !== null && nextObjects.some((object) => object.id === preferredId)) {
    return preferredId;
  }

  return nextObjects[nextObjects.length - 1]?.id || null;
}

function resolveSavedSelection(prevState, nextData) {
  if (!prevState.selectedObjectId) {
    return nextData.objects[0]?.id || null;
  }

  if (nextData.objects.some((object) => object.id === prevState.selectedObjectId)) {
    return prevState.selectedObjectId;
  }

  const previousObject = prevState.current?.objects?.find((object) => object.id === prevState.selectedObjectId);
  if (!previousObject) {
    return nextData.objects[0]?.id || null;
  }

  const matchedObject = nextData.objects.find(
    (object) =>
      object.type === previousObject.type &&
      object.tableId === previousObject.tableId &&
      object.label === previousObject.label &&
      object.x === previousObject.x &&
      object.y === previousObject.y &&
      object.width === previousObject.width &&
      object.height === previousObject.height
  );

  return matchedObject?.id || nextData.objects[0]?.id || null;
}

function MapSettings({ map, onMapFieldChange, t }) {
  return (
    <div className="editor-properties-stack">
      <div>
        <h4 className="panel-section-title">{t('mapEditor.mapSettingsTitle')}</h4>
        <p className="muted small">{t('mapEditor.mapSettingsDescription')}</p>
      </div>

      <label>
        {t('mapEditor.fields.backgroundImage')}
        <input
          type="url"
          value={map.backgroundImage}
          placeholder="https://example.com/floorplan.png"
          onChange={(event) => onMapFieldChange('backgroundImage', event.target.value)}
        />
      </label>

      <label>
        {t('mapEditor.fields.backgroundColor')}
        <input type="color" value={map.backgroundColor || '#f8fafc'} onChange={(event) => onMapFieldChange('backgroundColor', event.target.value)} />
      </label>
    </div>
  );
}

function MapObjectProperties({ selectedObject, tableMap, zoneMap, tables, onFieldChange, onDuplicate, onDelete, t }) {
  if (!selectedObject) {
    return <p className="muted">{t('mapEditor.noSelection')}</p>;
  }

  const table = selectedObject.tableId ? tableMap.get(selectedObject.tableId) : null;
  const zone = table?.zoneId ? zoneMap.get(table.zoneId) : null;

  return (
    <div className="editor-properties-stack">
      <div className="editor-object-summary">
        <span className={`editor-object-badge ${getObjectAccent(selectedObject)}`}>
          {t(`mapEditor.objectType.${selectedObject.type}`)}
        </span>
        <strong>{getObjectDisplayName(selectedObject, tableMap, t)}</strong>
        <span className="muted small">
          #{selectedObject.id}
          {table ? ` • ${table.code || table.name}` : ''}
          {zone ? ` • ${zone.name}` : ''}
        </span>
      </div>

      <div className="actions compact">
        <button type="button" className="btn btn-secondary btn-small" onClick={onDuplicate}>
          {t('mapEditor.duplicateSelected')}
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>
          {t('mapEditor.deleteSelected')}
        </button>
      </div>

      <div className="editor-form-grid">
        {PROPERTY_FIELDS.map((field) => (
          <label key={field.key}>
            {t(`mapEditor.fields.${field.key}`)}
            <input
              type={field.type}
              step={field.step ?? undefined}
              value={selectedObject[field.key]}
              onChange={(event) => onFieldChange(field.key, event.target.value)}
            />
          </label>
        ))}

        {selectedObject.type === 'TABLE' ? (
          <>
            <label>
              {t('mapEditor.fields.tableId')}
              <select value={selectedObject.tableId || ''} onChange={(event) => onFieldChange('tableId', event.target.value)}>
                <option value="">{t('mapEditor.unassignedTable')}</option>
                {tables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code || item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('mapEditor.fields.tablePhotoUrl')}
              <input
                type="url"
                value={table?.photoUrl || ''}
                placeholder="https://example.com/table-photo.jpg"
                onChange={(event) => onFieldChange('tablePhotoUrl', event.target.value)}
                disabled={!selectedObject.tableId}
              />
            </label>

            {table?.photoUrl ? (
              <div className="editor-table-photo-preview">
                <img src={table.photoUrl} alt={table.name || table.code || t('map.fields.table')} />
              </div>
            ) : null}
          </>
        ) : null}

        <label className="editor-toggle-field">
          <span>{t('mapEditor.fields.isActive')}</span>
          <input type="checkbox" checked={selectedObject.isActive} onChange={(event) => onFieldChange('isActive', event.target.checked)} />
        </label>
      </div>
    </div>
  );
}

export default function MapEditorPage() {
  const { t } = useAdminI18n();
  const objectIdRef = useRef(0);
  const [editorState, setEditorState] = useState({
    loading: true,
    saving: false,
    mapsLoading: true,
    creatingMap: false,
    error: '',
    saveMessage: '',
    maps: [],
    selectedMapId: null,
    defaultMapId: null,
    newMapPreset: MAP_VARIANT_PRESETS[0].key,
    newMapName: '',
    newMapDescription: '',
    makeNewMapDefault: false,
    original: null,
    current: null,
    selectedObjectId: null
  });

  useEffect(() => {
    loadInitialMapEditor().catch(() => {
      setEditorState((prev) => ({
        ...prev,
        mapsLoading: false,
        loading: false,
        error: t('mapEditor.errors.load')
      }));
    });
  }, [t]);

  useEffect(() => {
    function handleKeyDown(event) {
      const tagName = event.target?.tagName;
      const isEditableTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || event.target?.isContentEditable;

      if (isEditableTarget || !editorState.selectedObjectId || !['Delete', 'Backspace'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      handleDeleteSelected();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState.selectedObjectId, editorState.current, t]);

  async function loadInitialMapEditor() {
    setEditorState((prev) => ({
      ...prev,
      mapsLoading: true,
      loading: true,
      error: '',
      saveMessage: ''
    }));

    const mapsResult = await apiRequest('/api/admin/maps');
    if (!mapsResult.response.ok) {
      setEditorState((prev) => ({
        ...prev,
        mapsLoading: false,
        loading: false,
        error: mapsResult.body?.message || t('mapEditor.errors.load')
      }));
      return;
    }

    const maps = Array.isArray(mapsResult.body?.maps) ? mapsResult.body.maps : [];
    const defaultMap = maps.find((item) => item.isDefault) || maps[0];

    if (!defaultMap?.id) {
      setEditorState((prev) => ({
        ...prev,
        mapsLoading: false,
        loading: false,
        maps: [],
        error: t('mapEditor.errors.load')
      }));
      return;
    }

    setEditorState((prev) => ({
      ...prev,
      mapsLoading: false,
      maps,
      selectedMapId: defaultMap.id,
      defaultMapId: defaultMap.id
    }));

    await loadMapEditor(defaultMap.id);
  }

  async function loadMapEditor(mapId) {
    setEditorState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      saveMessage: ''
    }));

    const editorResult = await apiRequest(`/api/admin/maps/${mapId}/editor`);

    if (!editorResult.response.ok || !editorResult.body?.map?.id) {
      setEditorState((prev) => ({
        ...prev,
        loading: false,
        error: editorResult.body?.message || t('mapEditor.errors.load')
      }));
      return;
    }

    const currentMapId = Number(editorResult.body.map.id);
    const nextData = buildEditorState(editorResult.body);

    setEditorState((prev) => ({
      ...prev,
      loading: false,
      saving: false,
      error: '',
      saveMessage: '',
      defaultMapId: currentMapId,
      selectedMapId: currentMapId,
      original: nextData,
      current: nextData,
      selectedObjectId: nextData.objects[0]?.id || null
    }));
  }

  const map = editorState.current?.map;
  const objects = editorState.current?.objects || [];
  const tableMap = useMemo(
    () => new Map((editorState.current?.tables || []).map((table) => [table.id, table])),
    [editorState.current?.tables]
  );
  const zoneMap = useMemo(
    () => new Map((editorState.current?.zones || []).map((zone) => [zone.id, zone])),
    [editorState.current?.zones]
  );
  const selectedObject = useMemo(
    () => objects.find((object) => object.id === editorState.selectedObjectId) || null,
    [objects, editorState.selectedObjectId]
  );
  const hasChanges = useMemo(() => {
    if (!editorState.original || !editorState.current) {
      return false;
    }

    return JSON.stringify(editorState.original) !== JSON.stringify(editorState.current);
  }, [editorState.current, editorState.original]);

  function updateCurrent(updater) {
    setEditorState((prev) => {
      if (!prev.current?.map) {
        return prev;
      }

      return {
        ...prev,
        ...updater(prev),
        saveMessage: '',
        error: ''
      };
    });
  }

  function updateObject(objectId, updater) {
    updateCurrent((prev) => {
      const nextObjects = prev.current.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }

        return normalizeObject(updater(object), prev.current.map);
      });

      return {
        current: {
          ...prev.current,
          objects: nextObjects
        }
      };
    });
  }

  function handleFieldChange(field, value) {
    if (!selectedObject) {
      return;
    }

    if (field === 'tablePhotoUrl') {
      if (!selectedObject.tableId) {
        return;
      }

      updateCurrent((prev) => ({
        current: {
          ...prev.current,
          tables: prev.current.tables.map((table) =>
            table.id === selectedObject.tableId
              ? {
                  ...table,
                  photoUrl: String(value)
                }
              : table
          )
        }
      }));

      return;
    }

    updateObject(selectedObject.id, (object) => {
      if (field === 'label') {
        return { ...object, label: String(value) };
      }

      if (field === 'isActive') {
        return { ...object, isActive: Boolean(value) };
      }

      if (field === 'tableId') {
        return {
          ...object,
          tableId: value === '' ? null : Number(value)
        };
      }


      const numericValue = Number(value);
      return {
        ...object,
        [field]: Number.isFinite(numericValue) ? numericValue : object[field]
      };
    });
  }

  function handleMapFieldChange(field, value) {
    updateCurrent((prev) => ({
      current: {
        ...prev.current,
        map: {
          ...prev.current.map,
          [field]: String(value)
        }
      }
    }));
  }

  function handleDragStop(objectId, position) {
    updateObject(objectId, (object) => ({
      ...object,
      x: roundCoordinate(position.x),
      y: roundCoordinate(position.y)
    }));
  }

  function handleResizeStop(objectId, position, size) {
    updateObject(objectId, (object) => ({
      ...object,
      x: roundCoordinate(position.x),
      y: roundCoordinate(position.y),
      width: roundCoordinate(size.width),
      height: roundCoordinate(size.height)
    }));
  }

  function rotateSelected(delta) {
    if (!selectedObject) {
      return;
    }

    updateObject(selectedObject.id, (object) => ({
      ...object,
      rotation: object.rotation + delta
    }));
  }

  function buildNewObject(type, currentMap, currentObjects) {
    const preset = CREATION_PRESETS[type] || CREATION_PRESETS.DECOR;
    const maxZIndex = currentObjects.reduce((max, object) => Math.max(max, Number(object.zIndex) || 0), 0);
    const width = preset.width;
    const height = preset.height;
    const centeredX = Math.round((currentMap.width - width) / 2);
    const centeredY = Math.round((currentMap.height - height) / 2);

    objectIdRef.current += 1;

    return normalizeObject(
      {
        id: `tmp-${Date.now()}-${objectIdRef.current}`,
        type,
        label: type === 'LABEL' ? t('mapEditor.newLabelDefault') : '',
        tableId: null,
        x: centeredX,
        y: centeredY,
        width,
        height,
        rotation: 0,
        zIndex: maxZIndex + 1,
        isActive: true
      },
      currentMap
    );
  }

  function createObject(type) {
    updateCurrent((prev) => {
      const newObject = buildNewObject(type, prev.current.map, prev.current.objects);
      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, newObject]
        },
        selectedObjectId: newObject.id
      };
    });
  }

  function createSurfacePreset(preset) {
    updateCurrent((prev) => {
      const newObject = buildNewObject(preset.objectType, prev.current.map, prev.current.objects);
      newObject.label = preset.objectLabel;
      newObject.width = preset.width;
      newObject.height = preset.height;

      const normalizedObject = normalizeObject(newObject, prev.current.map);
      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, normalizedObject]
        },
        selectedObjectId: normalizedObject.id
      };
    });
  }

  function duplicateSelected() {
    if (!selectedObject || !editorState.current?.map) {
      return;
    }

    updateCurrent((prev) => {
      const duplicate = normalizeObject(
        {
          ...selectedObject,
          id: `tmp-${Date.now()}-${objectIdRef.current + 1}`,
          x: selectedObject.x + 24,
          y: selectedObject.y + 24,
          zIndex: Math.max(selectedObject.zIndex + 1, prev.current.objects.reduce((max, object) => Math.max(max, object.zIndex), 0) + 1)
        },
        prev.current.map
      );

      objectIdRef.current += 1;

      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, duplicate]
        },
        selectedObjectId: duplicate.id
      };
    });
  }

  function handleDeleteSelected() {
    if (!selectedObject) {
      return;
    }

    const confirmed = window.confirm(t('mapEditor.deleteConfirm', { name: getObjectDisplayName(selectedObject, tableMap, t) }));
    if (!confirmed) {
      return;
    }

    updateCurrent((prev) => {
      const nextObjects = prev.current.objects.filter((object) => object.id !== prev.selectedObjectId);
      return {
        current: {
          ...prev.current,
          objects: nextObjects
        },
        selectedObjectId: getNextSelectionId(nextObjects)
      };
    });
  }

  async function saveChanges() {
    if (!editorState.current || !editorState.defaultMapId) {
      return;
    }

    setEditorState((prev) => ({
      ...prev,
      saving: true,
      error: '',
      saveMessage: ''
    }));

    const payload = {
      map: {
        backgroundImage: editorState.current.map.backgroundImage || null,
        backgroundColor: editorState.current.map.backgroundColor || null
      },
      tables: editorState.current.tables.map((table) => ({
        id: table.id,
        photoUrl: table.photoUrl || null
      })),
      objects: editorState.current.objects.map((object) => ({
        id: object.id,
        type: object.type,
        tableId: object.type === 'TABLE' ? object.tableId : null,
        label: object.label || null,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
        zIndex: object.zIndex,
        isActive: object.isActive
      }))
    };

    const result = await apiRequest(`/api/admin/maps/${editorState.defaultMapId}/editor`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!result.response.ok) {
      setEditorState((prev) => ({
        ...prev,
        saving: false,
        error: result.body?.message || t('mapEditor.errors.save')
      }));
      return;
    }

    const nextData = buildEditorState(result.body);
    setEditorState((prev) => ({
      ...prev,
      saving: false,
      error: '',
      saveMessage: t('mapEditor.saveSuccess'),
      original: nextData,
      current: nextData,
      selectedObjectId: resolveSavedSelection(prev, nextData)
    }));
  }

  function resetChanges() {
    setEditorState((prev) => {
      if (!prev.original) {
        return prev;
      }

      return {
        ...prev,
        current: prev.original,
        error: '',
        saveMessage: '',
        selectedObjectId: prev.original.objects.some((object) => object.id === prev.selectedObjectId)
          ? prev.selectedObjectId
          : prev.original.objects[0]?.id || null
      };
    });
  }

  async function handleMapSelectionChange(nextMapId) {
    if (!nextMapId || Number(nextMapId) === Number(editorState.selectedMapId)) {
      return;
    }

    await loadMapEditor(Number(nextMapId));
  }

  function buildNewMapPayload() {
    const preset = MAP_VARIANT_PRESETS.find((item) => item.key === editorState.newMapPreset) || MAP_VARIANT_PRESETS[0];
    const baseName = String(editorState.newMapName || '').trim() || preset.name;
    const baseSlug = `${preset.slugPrefix}-${Date.now()}`;

    return {
      name: baseName,
      slug: baseSlug,
      description: String(editorState.newMapDescription || '').trim() || preset.description,
      sourceMapId: editorState.selectedMapId,
      makeDefault: Boolean(editorState.makeNewMapDefault)
    };
  }

  async function createMapVariant() {
    setEditorState((prev) => ({
      ...prev,
      creatingMap: true,
      error: '',
      saveMessage: ''
    }));

    const result = await apiRequest('/api/admin/maps', {
      method: 'POST',
      body: JSON.stringify(buildNewMapPayload())
    });

    if (!result.response.ok || !result.body?.map?.id) {
      setEditorState((prev) => ({
        ...prev,
        creatingMap: false,
        error: result.body?.message || t('mapEditor.errors.createMap')
      }));
      return;
    }

    const mapsResult = await apiRequest('/api/admin/maps');
    const maps = mapsResult.response.ok && Array.isArray(mapsResult.body?.maps) ? mapsResult.body.maps : editorState.maps;
    const nextData = buildEditorState(result.body);

    setEditorState((prev) => ({
      ...prev,
      creatingMap: false,
      maps,
      defaultMapId: Number(result.body.map.id),
      selectedMapId: Number(result.body.map.id),
      original: nextData,
      current: nextData,
      selectedObjectId: nextData.objects[0]?.id || null,
      newMapName: '',
      newMapDescription: '',
      makeNewMapDefault: false,
      saveMessage: t('mapEditor.mapCreatedSuccess')
    }));
  }

  return (
    <AdminLayout>
      <PageContainer title={t('mapEditor.title')} description={t('mapEditor.description')}>
        <section className="page-hero compact map-editor-hero">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('mapEditor.eyebrow')}</span>
            <h3>{t('mapEditor.heroTitle')}</h3>
            <p className="muted">{t('mapEditor.heroDescription')}</p>
          </div>
          <div className="hero-inline-note">{t('mapEditor.note')}</div>
        </section>

        <div className="map-editor-toolbar">
          <div className="map-editor-toolbar-group">
            <label>
              {t('mapEditor.mapVariant')}
              <select
                value={editorState.selectedMapId || ''}
                onChange={(event) => handleMapSelectionChange(event.target.value)}
                disabled={editorState.loading || editorState.mapsLoading || editorState.saving}
              >
                {(editorState.maps || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.slug}){item.isDefault ? ` • ${t('mapEditor.defaultMapBadge')}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="map-editor-toolbar-group compact-actions">
            <label>
              {t('mapEditor.newMapPreset')}
              <select
                value={editorState.newMapPreset}
                onChange={(event) => setEditorState((prev) => ({ ...prev, newMapPreset: event.target.value }))}
                disabled={editorState.creatingMap}
              >
                {MAP_VARIANT_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="text"
              value={editorState.newMapName}
              placeholder={t('mapEditor.newMapNamePlaceholder')}
              onChange={(event) => setEditorState((prev) => ({ ...prev, newMapName: event.target.value }))}
              disabled={editorState.creatingMap}
            />
            <input
              type="text"
              value={editorState.newMapDescription}
              placeholder={t('mapEditor.newMapDescriptionPlaceholder')}
              onChange={(event) => setEditorState((prev) => ({ ...prev, newMapDescription: event.target.value }))}
              disabled={editorState.creatingMap}
            />
            <label className="editor-toggle-field">
              <span>{t('mapEditor.makeDefault')}</span>
              <input
                type="checkbox"
                checked={editorState.makeNewMapDefault}
                onChange={(event) => setEditorState((prev) => ({ ...prev, makeNewMapDefault: event.target.checked }))}
                disabled={editorState.creatingMap}
              />
            </label>
            <button type="button" className="btn btn-secondary btn-small" onClick={createMapVariant} disabled={editorState.creatingMap || editorState.loading}>
              {editorState.creatingMap ? t('mapEditor.creatingMap') : t('mapEditor.createMap')}
            </button>
          </div>
        </div>

        <div className="map-editor-toolbar">
          <div className="map-editor-toolbar-group">
            <button type="button" className="btn" onClick={saveChanges} disabled={!hasChanges || editorState.saving || editorState.loading}>
              {editorState.saving ? t('mapEditor.saving') : t('mapEditor.save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetChanges} disabled={!hasChanges || editorState.saving || editorState.loading}>
              {t('mapEditor.reset')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditorState((prev) => ({ ...prev, selectedObjectId: null }))}
              disabled={!selectedObject}
            >
              {t('mapEditor.clearSelection')}
            </button>
          </div>

          <div className="map-editor-toolbar-group compact-actions">
            {CREATION_ACTIONS.map((type) => (
              <button key={type} type="button" className="btn btn-secondary btn-small" onClick={() => createObject(type)} disabled={!map}>
                {t('mapEditor.addObject', { type: t(`mapEditor.objectType.${type}`) })}
              </button>
            ))}
            {SURFACE_PRESETS.map((preset) => (
              <button key={preset.key} type="button" className="btn btn-secondary btn-small" onClick={() => createSurfacePreset(preset)} disabled={!map}>
                + {preset.label}
              </button>
            ))}
          </div>

          <div className="map-editor-toolbar-group">
            <button type="button" className="btn btn-secondary btn-small" onClick={duplicateSelected} disabled={!selectedObject}>
              {t('mapEditor.duplicateSelected')}
            </button>
            <button type="button" className="btn btn-danger btn-small" onClick={handleDeleteSelected} disabled={!selectedObject}>
              {t('mapEditor.deleteSelected')}
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => rotateSelected(-15)} disabled={!selectedObject}>
              {t('mapEditor.rotateLeft')}
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => rotateSelected(15)} disabled={!selectedObject}>
              {t('mapEditor.rotateRight')}
            </button>
          </div>
        </div>

        {map ? (
          <div className="map-meta muted">
            {t('mapEditor.meta', {
              map: map.name || '—',
              size: `${map.width}×${map.height}`,
              objects: objects.length,
              tables: editorState.current?.tables?.length || 0
            })}
          </div>
        ) : null}

        {editorState.loading ? <p>{t('mapEditor.loading')}</p> : null}
        {editorState.error ? <p className="error">{editorState.error}</p> : null}
        {editorState.saveMessage ? <p className="success-text">{editorState.saveMessage}</p> : null}

        {!editorState.loading && editorState.current ? (
          <div className="map-editor-layout">
            <PanelCard title={t('mapEditor.canvasTitle')} subtitle={t('mapEditor.canvasDescription')} className="full-height">
              <div className="map-editor-canvas-shell">
                <div
                  className="map-editor-canvas"
                  style={{
                    width: `${map.width}px`,
                    height: `${map.height}px`
                  }}
                >
                  {map.backgroundImage ? (
                    <div
                      className="map-editor-canvas-background"
                      style={{
                        backgroundColor: map.backgroundColor || '#f8fafc',
                        backgroundImage: map.backgroundImage ? `url(${map.backgroundImage})` : 'none'
                      }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="map-editor-canvas-background" style={{ backgroundColor: map.backgroundColor || '#f8fafc' }} aria-hidden="true" />
                  )}
                  <div className="map-editor-canvas-grid" aria-hidden="true" />

                  {objects.map((object) => {
                    const table = object.tableId ? tableMap.get(object.tableId) : null;
                    const zone = table?.zoneId ? zoneMap.get(table.zoneId) : null;

                    return (
                      <Rnd
                        key={object.id}
                        bounds="parent"
                        size={{ width: object.width, height: object.height }}
                        position={{ x: object.x, y: object.y }}
                        onDragStop={(_, data) => handleDragStop(object.id, data)}
                        onResizeStop={(_, __, ref, ___, position) =>
                          handleResizeStop(object.id, position, {
                            width: ref.offsetWidth,
                            height: ref.offsetHeight
                          })
                        }
                        onMouseDown={() => setEditorState((prev) => ({ ...prev, selectedObjectId: object.id }))}
                        enableResizing
                        dragGrid={[1, 1]}
                        resizeGrid={[1, 1]}
                        className="map-editor-rnd"
                        style={{ zIndex: object.zIndex }}
                      >
                        <button
                          type="button"
                          className={`map-editor-object ${getObjectAccent(object)} ${editorState.selectedObjectId === object.id ? 'selected' : ''} ${object.isActive ? '' : 'inactive'}`.trim()}
                          onClick={() => setEditorState((prev) => ({ ...prev, selectedObjectId: object.id }))}
                          title={zone ? `${getObjectDisplayName(object, tableMap, t)} • ${zone.name}` : getObjectDisplayName(object, tableMap, t)}
                        >
                          <span className="map-editor-object-type">{t(`mapEditor.objectType.${object.type}`)}</span>
                          <strong>{getObjectDisplayName(object, tableMap, t)}</strong>
                          {zone ? <span className="map-editor-object-meta">{zone.name}</span> : null}
                        </button>
                      </Rnd>
                    );
                  })}
                </div>
              </div>
            </PanelCard>

            <div className="editor-sidebar-stack">
              <PanelCard title={t('mapEditor.mapSettingsTitle')} subtitle={t('mapEditor.mapSettingsDescription')} className="surface-muted">
                <MapSettings map={map} onMapFieldChange={handleMapFieldChange} t={t} />
              </PanelCard>

              <PanelCard title={t('mapEditor.propertiesTitle')} subtitle={t('mapEditor.propertiesDescription')} className="full-height surface-muted">
                <MapObjectProperties
                  selectedObject={selectedObject}
                  tableMap={tableMap}
                  zoneMap={zoneMap}
                  tables={editorState.current.tables}
                  onFieldChange={handleFieldChange}
                  onDuplicate={duplicateSelected}
                  onDelete={handleDeleteSelected}
                  t={t}
                />
              </PanelCard>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
