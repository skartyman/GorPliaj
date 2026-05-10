import { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import { apiRequest, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const TEXTURE_ASSETS_STORAGE_KEY = 'map-editor-texture-assets';

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
  { key: 'label', type: 'text', section: 'General' },
  { key: 'interactionMode', type: 'select', section: 'General', options: [
    { value: 'DECOR', label: 'Декор' },
    { value: 'SELECTABLE', label: 'Вибирається гостем' }
  ]},
  { key: 'texture', type: 'select', section: 'Graphics', options: [
    { value: '', label: 'Без текстури' },
    { value: 'grass', label: 'Трава' },
    { value: 'sand', label: 'Пісок' },
    { value: 'water', label: 'Вода' },
    { value: 'wood', label: 'Дерево' }
  ]},
  { key: 'textureUrl', type: 'text', section: 'Graphics', placeholder: 'Texture image URL' },
  { key: 'opacity', type: 'number', section: 'Graphics', step: 0.05 },
  { key: 'svgUrl', type: 'text', section: 'Graphics', placeholder: 'R2 URL or external SVG' },
  { key: 'svgCode', type: 'textarea', section: 'Graphics', placeholder: '<svg>...</svg>' },
  { key: 'strokeWidth', type: 'number', section: 'Graphics', step: 1 },
  { key: 'strokeColor', type: 'color', section: 'Graphics' },
  { key: 'x', type: 'number', section: 'Transform', step: 1 },
  { key: 'y', type: 'number', section: 'Transform', step: 1 },
  { key: 'width', type: 'number', section: 'Transform', step: 1 },
  { key: 'height', type: 'number', section: 'Transform', step: 1 },
  { key: 'rotation', type: 'number', section: 'Transform', step: 1 },
  { key: 'zIndex', type: 'number', section: 'Transform', step: 1 }
];
const META_PROPERTY_FIELDS = new Set(['interactionMode', 'texture', 'textureUrl', 'opacity', 'svgUrl', 'svgCode', 'strokeWidth', 'strokeColor']);
const MIN_MAP_SCALE = 0.25;
const MAX_MAP_SCALE = 1.75;
const MAP_SCALE_STEP = 0.1;
const MAP_VIEWPORT_PADDING = 18;
const SURFACE_Z_INDEX = 0;
const SECTION_LABEL_KEYS = {
  General: 'mapEditor.sections.general',
  Graphics: 'mapEditor.sections.graphics',
  Transform: 'mapEditor.sections.transform'
};
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

const ASSET_CATEGORIES = {
  SURFACES: {
    label: 'Поверхні',
    items: [
      { type: 'CUSTOM', label: 'Полігон', width: 240, height: 160, subType: 'POLYGON', texture: 'sand', zIndex: SURFACE_Z_INDEX },
      { type: 'CUSTOM', label: 'Пісок', width: 280, height: 160, subType: 'POLYGON', texture: 'sand', zIndex: SURFACE_Z_INDEX },
      { type: 'CUSTOM', label: 'Дерево', width: 260, height: 120, subType: 'POLYGON', texture: 'wood', zIndex: SURFACE_Z_INDEX },
      { type: 'CUSTOM', label: 'Вода', width: 320, height: 160, subType: 'POLYGON', texture: 'water', zIndex: SURFACE_Z_INDEX },
      { type: 'CUSTOM', label: 'Зелена зона', width: 220, height: 140, subType: 'POLYGON', texture: 'grass', zIndex: SURFACE_Z_INDEX }
    ]
  },
  FURNITURE: {
    label: 'Меблі',
    items: [
      { type: 'TABLE', label: 'Стіл 4', width: 100, height: 70 },
      { type: 'TABLE', label: 'Стіл 2', width: 60, height: 60 },
      { type: 'TABLE', label: 'Стіл 6', width: 160, height: 70 },
      { type: 'CUSTOM', label: 'Шезлонг', width: 80, height: 160, subType: 'SUNBED' },
      { type: 'CUSTOM', label: 'Парасоля', width: 120, height: 120, subType: 'UMBRELLA' },
      { type: 'CUSTOM', label: 'Ліжко', width: 160, height: 200, subType: 'BED', interactionMode: 'SELECTABLE' }
    ]
  },
  NATURE: {
    label: 'Озеленення',
    items: [
      { type: 'DECOR', label: 'Дерево', width: 120, height: 120, subType: 'TREE' },
      { type: 'DECOR', label: 'Кущ', width: 80, height: 80, subType: 'BUSH' },
      { type: 'DECOR', label: 'Квіти', width: 40, height: 40, subType: 'FLOWER' }
    ]
  },
  INFRASTRUCTURE: {
    label: 'Інфраструктура',
    items: [
      { type: 'ENTRANCE', label: 'Вхід', width: 110, height: 50 },
      { type: 'WC', label: 'WC', width: 90, height: 70 },
      { type: 'STAIRS', label: 'Сходи', width: 120, height: 80 },
      { type: 'CUSTOM', label: 'Кухня', width: 200, height: 150, subType: 'KITCHEN' },
      { type: 'CUSTOM', label: 'Каса', width: 100, height: 60, subType: 'CASHIER' }
    ]
  }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundCoordinate(value) {
  return Math.round(Number(value) || 0);
}

function clampScale(value) {
  return Math.min(Math.max(Number(value) || 1, MIN_MAP_SCALE), MAX_MAP_SCALE);
}

function calculateFitScale(container, map) {
  if (!container || !map?.width || !map?.height) {
    return 1;
  }

  const availableWidth = Math.max(container.clientWidth - MAP_VIEWPORT_PADDING * 2, 320);
  const availableHeight = Math.max(container.clientHeight - MAP_VIEWPORT_PADDING * 2, 240);
  return clampScale(Math.min(availableWidth / map.width, availableHeight / map.height, 1));
}

function getCanvasPoint(event, scale) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.round((event.clientX - rect.left) / scale),
    y: Math.round((event.clientY - rect.top) / scale)
  };
}

function getPolygonBounds(points) {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 24),
    height: Math.max(maxY - minY, 24)
  };
}

function normalizePolygonPoints(points, bounds) {
  return points.map((point) => ({
    x: Math.round(point.x - bounds.x),
    y: Math.round(point.y - bounds.y)
  }));
}

function pointsToSvg(points) {
  return (points || []).map((point) => `${point.x},${point.y}`).join(' ');
}

function loadTextureAssets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEXTURE_ASSETS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cloneEditorSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function normalizeSelectionIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function normalizeSelectionToObjects(ids, objects) {
  const validIds = new Set((objects || []).map((object) => object.id));
  return normalizeSelectionIds(ids).filter((id) => validIds.has(id));
}

function normalizeMap(map) {
  if (!map) {
    return null;
  }

  return {
    ...map,
    width: Math.max(roundCoordinate(map.width), 100),
    height: Math.max(roundCoordinate(map.height), 100),
    backgroundImage: String(map.backgroundImage || '').trim(),
    backgroundColor: String(map.backgroundColor || '').trim() || '#f8fafc'
  };
}

function normalizeObject(object, map) {
  const width = Math.max(roundCoordinate(object.width), 24);
  const height = Math.max(roundCoordinate(object.height), 24);
  const maxX = Math.max((map?.width || 0) - width, 0);
  const maxY = Math.max((map?.height || 0) - height, 0);
  const metaJson = object.metaJson && typeof object.metaJson === 'object' ? object.metaJson : {};
  const interactionMode = typeof metaJson.interactionMode === 'string'
    ? metaJson.interactionMode
    : (String(metaJson.subType || '').toUpperCase() === 'BED' ? 'SELECTABLE' : '');

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
    isActive: Boolean(object.isActive),
    metaJson: {
      ...metaJson,
      interactionMode
    }
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

function getObjectAccent(object, language) {
  if (object.type === 'TABLE') {
    return 'table';
  }

  const labelStr = localizeField(object.label, language);
  const normalizedLabel = String(labelStr || '').toLowerCase();
  if (/(sand|пісок|песок)/i.test(normalizedLabel)) return 'sand';
  if (/(sea|море)/i.test(normalizedLabel)) return 'sea';
  if (/(deck|настил)/i.test(normalizedLabel)) return 'deck';
  if (/(wooden path|дерев'яна доріжка|деревянная дорожка)/i.test(normalizedLabel)) return 'path';

  return STATIC_TYPE_ACCENTS[object.type] || 'static';
}

function getObjectDisplayName(object, tableMap, t, language) {
  if (object.type === 'TABLE') {
    const table = object.tableId ? tableMap.get(object.tableId) : null;
    return table?.code || localizeField(table?.name, language) || localizeField(object.label, language) || t('mapEditor.objectType.TABLE');
  }

  return localizeField(object.label, language) || t(`mapEditor.objectType.${object.type}`);
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
      JSON.stringify(object.label) === JSON.stringify(previousObject.label) &&
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
      <div className="editor-form-grid map-settings-grid">
        <label>
          <span>{t('mapEditor.fields.mapWidth')}</span>
          <input
            type="number"
            min="100"
            step="50"
            value={map.width}
            onChange={(event) => onMapFieldChange('width', event.target.value)}
          />
        </label>

        <label>
          <span>{t('mapEditor.fields.mapHeight')}</span>
          <input
            type="number"
            min="100"
            step="50"
            value={map.height}
            onChange={(event) => onMapFieldChange('height', event.target.value)}
          />
        </label>

        <div className="map-size-actions map-size-actions--compact">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onMapFieldChange('width', Number(map.width) + 500)}>
            {t('mapEditor.expandWidth')}
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onMapFieldChange('height', Number(map.height) + 500)}>
            {t('mapEditor.expandHeight')}
          </button>
        </div>

        <label className="map-settings-span-2">
          <span>{t('mapEditor.fields.backgroundImage')}</span>
          <input
            type="url"
            value={map.backgroundImage}
            placeholder="https://example.com/floorplan.png"
            onChange={(event) => onMapFieldChange('backgroundImage', event.target.value)}
          />
        </label>

        <label>
          <span>{t('mapEditor.fields.backgroundColor')}</span>
          <input type="color" value={map.backgroundColor || '#f8fafc'} onChange={(event) => onMapFieldChange('backgroundColor', event.target.value)} />
        </label>
      </div>
    </div>
  );
}

function MapObjectProperties({ selectedObject, tableMap, zoneMap, tables, onFieldChange, onDuplicate, onDelete, onLayerAction, onSave, t, language }) {
  if (!selectedObject) {
    return <p className="muted">{t('mapEditor.noSelection')}</p>;
  }

  const table = selectedObject.tableId ? tableMap.get(selectedObject.tableId) : null;
  const zone = table?.zoneId ? zoneMap.get(table.zoneId) : null;
  const isLocked = Boolean(selectedObject.metaJson?.isLocked);

  const uploadFileToField = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('folder', 'menu');
    formData.append('image', file);

    const result = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: formData
    });

    if (result.response.ok && result.body?.url) {
      onFieldChange(field, result.body.url);
    } else {
      alert(result.body?.message || 'Upload failed');
    }

    event.target.value = '';
  };

  const sections = [...new Set(PROPERTY_FIELDS.map(f => f.section))];

  return (
    <div className="editor-properties-stack">
      <div className="editor-object-summary">
        <span className={`editor-object-badge ${getObjectAccent(selectedObject, language)}`}>
          {t(`mapEditor.objectType.${selectedObject.type}`)}
        </span>
        <strong>{getObjectDisplayName(selectedObject, tableMap, t, language)}</strong>
        <span className="muted small">
          #{selectedObject.id}
          {table ? ` • ${table.code || localizeField(table.name, language)}` : ''}
          {zone ? ` • ${localizeField(zone.name, language)}` : ''}
        </span>
      </div>

      <div className="actions compact editor-actions-grid">
        <button type="button" className="btn btn-primary btn-small" onClick={onSave}>
          {t('mapEditor.save')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => onFieldChange('isLocked', !isLocked)}
        >
          {isLocked ? t('mapEditor.unlockObject') : t('mapEditor.lockObject')}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onLayerAction('bottom')}>
          {t('mapEditor.sendToBottom')}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onLayerAction('back')}>
          {t('mapEditor.sendBackward')}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onLayerAction('front')}>
          {t('mapEditor.bringForward')}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onLayerAction('top')}>
          {t('mapEditor.bringToTop')}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={onDuplicate}>
          {t('mapEditor.duplicateSelected')}
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>
          {t('mapEditor.deleteSelected')}
        </button>
      </div>

      <div className="editor-inspector-sections">
        {sections.map(section => (
          <div key={section} className="inspector-section" style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              {t(SECTION_LABEL_KEYS[section] || section)}
            </h5>
            <div className="editor-form-grid">
              {PROPERTY_FIELDS.filter(f => f.section === section).map((field) => (
                  <label
                    key={field.key}
                    className={[
                      field.type === 'textarea' ? 'field-span-2' : '',
                      ['textureUrl', 'svgUrl'].includes(field.key) ? 'field-with-action' : ''
                    ].filter(Boolean).join(' ')}
                  >
                    <span style={{ display: 'block', marginBottom: '4px' }}>{t(`mapEditor.fields.${field.key}`)}</span>
                      {field.type === 'select' ? (
                        <select 
                          value={selectedObject.metaJson?.[field.key] || ''} 
                          onChange={(event) => onFieldChange(field.key, event.target.value)}
                        >
                      {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={selectedObject.metaJson?.[field.key] || ''}
                      placeholder={field.placeholder}
                      onChange={(event) => onFieldChange(field.key, event.target.value)}
                      style={{ height: '60px', fontFamily: 'monospace', fontSize: '10px' }}
                    />
                      ) : (
                        <div className="field-with-action-row">
                          <input
                            type={field.type}
                            step={field.step ?? undefined}
                            placeholder={field.placeholder}
                            value={field.key === 'label' ? localizeField(selectedObject[field.key], 'ua') : (selectedObject[field.key] ?? selectedObject.metaJson?.[field.key] ?? '')}
                            onChange={(event) => onFieldChange(field.key, event.target.value)}
                          />
                          {['svgUrl', 'textureUrl'].includes(field.key) && (
                            <button className="btn btn-secondary btn-small field-upload-button" type="button" onClick={() => document.getElementById(`${field.key}-upload`).click()}>
                              {t('mapEditor.uploadAsset')}
                            </button>
                          )}
                        </div>
                      )}
                </label>
              ))}
            </div>
          </div>
        ))} 
        <input id="svgUrl-upload" type="file" accept=".svg,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={(event) => uploadFileToField(event, 'svgUrl')} />
        <input id="textureUrl-upload" type="file" accept=".png,.jpg,.jpeg,.webp,.svg" style={{ display: 'none' }} onChange={(event) => uploadFileToField(event, 'textureUrl')} />

        {(selectedObject.metaJson?.svgUrl || selectedObject.metaJson?.svgCode) ? (
          <div className="custom-object-preview" style={{ marginBottom: '12px', minHeight: '96px' }}>
            {selectedObject.metaJson?.svgUrl ? (
              <img src={selectedObject.metaJson.svgUrl} alt="" />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: selectedObject.metaJson?.svgCode || '' }} />
            )}
          </div>
        ) : null}

        {selectedObject.type === 'TABLE' ? (
          <>
            <label>
              {t('mapEditor.fields.tableId')}
              <select value={selectedObject.tableId || ''} onChange={(event) => onFieldChange('tableId', event.target.value)}>
                <option value="">{t('mapEditor.unassignedTable')}</option>
                {tables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code || localizeField(item.name, language)}
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
                <img src={table.photoUrl} alt={localizeField(table.name, language) || table.code || t('map.fields.table')} />
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

const SVG_TEMPLATES = {
  TREE: (
    <g fill="#22c55e">
      <circle cx="50" cy="50" r="40" opacity="0.6" />
      <circle cx="40" cy="40" r="20" />
      <circle cx="60" cy="45" r="25" />
      <circle cx="50" cy="65" r="20" />
    </g>
  ),
  BUSH: (
    <g fill="#4ade80">
      <circle cx="30" cy="30" r="20" />
      <circle cx="50" cy="35" r="20" />
      <circle cx="40" cy="50" r="20" />
    </g>
  ),
  UMBRELLA: (
    <g fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2">
      <circle cx="50" cy="50" r="45" fill="#fff" />
      <path d="M50,5 L50,95 M5,50 L95,50 M18,18 L82,82 M18,82 L82,18" stroke="#e2e8f0" />
      <circle cx="50" cy="50" r="4" fill="#94a3b8" />
    </g>
  ),
  SUNBED: (
    <rect x="10" y="5" width="80" height="90" rx="4" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
  ),
  BED: (
    <g>
      <rect x="12" y="18" width="76" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="18" y="24" width="24" height="18" rx="3" fill="#e2e8f0" />
      <rect x="44" y="24" width="26" height="30" rx="4" fill="#dbeafe" />
      <rect x="18" y="50" width="62" height="10" rx="2" fill="#f1f5f9" />
      <rect x="20" y="62" width="10" height="20" rx="2" fill="#94a3b8" />
      <rect x="70" y="62" width="10" height="20" rx="2" fill="#94a3b8" />
      <rect x="16" y="72" width="18" height="6" rx="2" fill="#cbd5e1" />
      <rect x="66" y="72" width="18" height="6" rx="2" fill="#cbd5e1" />
    </g>
  ),
  STAIRS: (
    <g fill="none" stroke="#94a3b8" strokeWidth="2">
      <rect x="5" y="5" width="90" height="90" />
      <line x1="5" y1="25" x2="95" y2="25" />
      <line x1="5" y1="50" x2="95" y2="50" />
      <line x1="5" y1="75" x2="95" y2="75" />
    </g>
  )
};

function SVGDefinitions() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Grass Pattern */}
        <pattern id="pattern-grass" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#dcfce7" />
          <path d="M10,20 Q15,10 20,20 T30,20" stroke="#86efac" fill="none" strokeWidth="1" />
          <path d="M5,35 Q10,25 15,35 T25,35" stroke="#86efac" fill="none" strokeWidth="1" />
        </pattern>

        {/* Sand Pattern */}
        <pattern id="pattern-sand" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="#fef9c3" />
          <circle cx="10" cy="10" r="0.5" fill="#fde047" />
          <circle cx="30" cy="25" r="0.8" fill="#fde047" />
          <circle cx="15" cy="40" r="0.6" fill="#fde047" />
        </pattern>

        {/* Water Pattern */}
        <pattern id="pattern-water" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="#e0f2fe" />
          <path d="M0,20 Q15,10 30,20 T60,20" stroke="#bae6fd" fill="none" strokeWidth="2" opacity="0.5" />
          <path d="M0,45 Q15,35 30,45 T60,45" stroke="#bae6fd" fill="none" strokeWidth="2" opacity="0.5" />
        </pattern>

        {/* Wood Pattern */}
        <pattern id="pattern-wood" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
          <rect width="100" height="20" fill="#fef3c7" />
          <line x1="0" y1="19" x2="100" y2="19" stroke="#fcd34d" strokeWidth="1" />
          <path d="M20,10 Q50,5 80,10" stroke="#f59e0b" fill="none" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      </defs>
    </svg>
  );
}

function getTextureFill({ texture, textureUrl, fallback = '#f1f5f9' }) {
  if (textureUrl) return `url(${textureUrl})`;
  if (texture === 'sand') return 'url(#pattern-sand)';
  if (texture === 'water') return 'url(#pattern-water)';
  if (texture === 'wood') return 'url(#pattern-wood)';
  if (texture === 'grass') return 'url(#pattern-grass)';
  return fallback;
}

function MapObjectRenderer({ object, tableMap, zoneMap, t, language, isSelected }) {
  const table = object.tableId ? tableMap.get(object.tableId) : null;
  const zone = table?.zoneId ? zoneMap.get(table.zoneId) : null;
  const accent = getObjectAccent(object, language);

  const { subType, svgUrl, svgCode, texture, textureUrl, opacity, strokeWidth, strokeColor, isLocked } = object.metaJson || {};

  const renderObjectContent = () => {
    // 1. External SVG URL
    if (svgUrl) {
      return (
        <img 
          src={svgUrl} 
          alt="" 
          style={{ 
            width: '100%', height: '100%', 
            objectFit: 'contain', 
            pointerEvents: 'none',
            filter: strokeColor ? `drop-shadow(0 0 2px ${strokeColor})` : 'none'
          }} 
        />
      );
    }

    // 2. Raw SVG Code
    if (svgCode) {
      return (
        <div 
          style={{ width: '100%', height: '100%', color: strokeColor || 'inherit' }} 
          dangerouslySetInnerHTML={{ __html: svgCode }} 
        />
      );
    }

    if (subType === 'SVG') {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span className="muted small">{localizeField(object.label, language)}</span>
        </div>
      );
    }

    // 3. Built-in SVG Template
    if (subType && SVG_TEMPLATES[subType]) {
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: strokeColor || 'inherit' }}>
          {SVG_TEMPLATES[subType]}
        </svg>
      );
    }

    if (subType === 'POLYGON') {
      const points = object.metaJson?.points?.length
        ? object.metaJson.points
        : [
            { x: 0, y: 0 },
            { x: object.width, y: 0 },
            { x: object.width, y: object.height },
            { x: 0, y: object.height }
          ];

      const texturePatternId = `texture-${String(object.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
      const fill = textureUrl ? `url(#${texturePatternId})` : getTextureFill({ texture, textureUrl, fallback: '#e2e8f0' });

      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
          {textureUrl ? (
            <defs>
              <pattern id={texturePatternId} x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox">
                <image href={textureUrl} x="0" y="0" width={object.width} height={object.height} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            </defs>
          ) : null}
          <polygon
            points={pointsToSvg(points)}
            fill={fill}
            opacity={opacity || 1}
            stroke={strokeColor || '#64748b'}
            strokeWidth={strokeWidth || 2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }

    switch (object.type) {
      case 'TABLE':
        return (
          <div className="table-content" style={{ 
            width: '100%', 
            height: '100%', 
            background: '#fff', 
            border: `${strokeWidth || 2}px solid ${isSelected ? '#2563eb' : (strokeColor || '#cbd5e1')}`,
            borderRadius: object.width === object.height ? '50%' : '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '4px'
          }}>
            <strong style={{ fontSize: '12px' }}>{table?.code || localizeField(table?.name, language) || 'T'}</strong>
            <span style={{ fontSize: '9px', color: '#64748b' }}>{object.width > 80 ? t('map.fields.table') : ''}</span>
          </div>
        );
      case 'PATH':
        const pathData = object.metaJson?.pathData || `M 0 0 L ${object.width} 0`;
        return (
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <path 
              d={pathData} 
              stroke={strokeColor || "#64748b"} 
              strokeWidth={strokeWidth || "4"} 
              fill="none" 
              strokeLinecap="round"
              strokeDasharray={object.isActive ? 'none' : '8,8'}
            />
          </svg>
        );
      case 'CUSTOM':
        if (subType && SVG_TEMPLATES[subType]) {
          return (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: strokeColor || 'inherit', opacity: opacity || 1 }}>
              {SVG_TEMPLATES[subType]}
            </svg>
          );
        }

        if (svgUrl) {
          return (
            <img
              src={svgUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                opacity: opacity || 1
              }}
            />
          );
        }

        if (svgCode) {
          return (
            <div
              style={{ width: '100%', height: '100%', color: strokeColor || 'inherit', opacity: opacity || 1 }}
              dangerouslySetInnerHTML={{ __html: svgCode }}
            />
          );
        }

        if (texture || textureUrl || ['sand', 'sea', 'deck'].includes(accent)) {
          const accentTexture = texture || (accent === 'sand' ? 'sand' : accent === 'sea' ? 'water' : accent === 'deck' ? 'wood' : '');
          return <div style={{ width: '100%', height: '100%', background: getTextureFill({ texture: accentTexture, textureUrl }), borderRadius: '4px', opacity: opacity || 1 }} />;
        }

        return (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: '#f1f5f9', 
            border: '2px dashed #cbd5e1',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="muted small">{localizeField(object.label, language)}</span>
          </div>
        );
      default:
        return (
          <div className={`map-editor-object-v2 ${accent} ${isSelected ? 'selected' : ''}`} style={{ width: '100%', height: '100%' }}>
            <span className="map-editor-object-type">{t(`mapEditor.objectType.${object.type}`)}</span>
            <strong>{getObjectDisplayName(object, tableMap, t, language)}</strong>
          </div>
        );
    }
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        transform: `rotate(${object.rotation || 0}deg)`,
        transition: 'transform 0.2s'
      }}
    >
      {isLocked ? (
        <div
          title="Locked"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#0f172a',
            color: '#fff',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          #
        </div>
      ) : null}
      {renderObjectContent()}
      {isSelected && (
        <div style={{ 
          position: 'absolute', 
          top: -4, left: -4, right: -4, bottom: -4, 
          border: '2px solid #3b82f6', 
          borderRadius: '10px',
          pointerEvents: 'none'
        }} />
      )}
    </div>
  );
}

function LayerManager
({ objects, selectedObjectId, onSelect, tableMap, t, language }) {
  const sortedObjects = useMemo(() => [...objects].sort((a, b) => b.zIndex - a.zIndex), [objects]);

  return (
    <div className="editor-properties-stack">
      <div className="layer-list">
        {sortedObjects.map((object) => (
          <div
            key={object.id}
            className={`layer-item ${selectedObjectId === object.id ? 'selected' : ''}`}
            style={{
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '6px',
              cursor: 'pointer',
              background: selectedObjectId === object.id ? '#eff6ff' : '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onClick={() => onSelect(object.id)}
          >
            <span className={`editor-object-badge ${getObjectAccent(object, language)}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
              {object.zIndex}
            </span>
            <div style={{ display: 'grid' }}>
              <strong style={{ fontSize: '12px' }}>{getObjectDisplayName(object, tableMap, t, language)}</strong>
              <span className="muted small" style={{ fontSize: '10px' }}>{t(`mapEditor.objectType.${object.type}`)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextureLibrary({ textureAssets, selectedObject, onUpload, onApply, onDelete, t }) {
  return (
    <div className="texture-library">
      <div className="texture-library-head">
        <div>
          <strong>{t('mapEditor.texturesTitle')}</strong>
          <p className="muted small">{t('mapEditor.texturesDescription')}</p>
        </div>
        <label className="btn btn-secondary btn-small texture-upload-button">
          {t('mapEditor.uploadTexture')}
          <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={onUpload} />
        </label>
      </div>

      {textureAssets.length ? (
        <div className="texture-grid">
          {textureAssets.map((asset) => (
            <div key={asset.id} className="texture-item">
              <button
                type="button"
                className="texture-preview"
                style={{ backgroundImage: `url(${asset.url})` }}
                onClick={() => onApply(asset.url)}
                disabled={!selectedObject}
                title={selectedObject ? t('mapEditor.applyTexture') : t('mapEditor.noSelection')}
              />
              <div className="texture-item-meta">
                <span>{asset.name}</span>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => onDelete(asset.id)}>
                  {t('mapEditor.deleteTexture')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">{t('mapEditor.noTextures')}</p>
      )}
    </div>
  );
}

function CustomObjectCreator({ onCreate, t }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    label: '',
    width: 160,
    height: 120,
    zIndex: 1,
    interactionMode: 'SELECTABLE',
    svgUrl: '',
    svgCode: ''
  });

  async function uploadSvg(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('folder', 'menu');
    formData.append('image', file);

    const result = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: formData
    });

    if (result.response.ok && result.body?.url) {
      setDraft((prev) => ({ ...prev, svgUrl: result.body.url, svgCode: '' }));
    } else {
      alert(result.body?.message || 'Upload failed');
    }

    event.target.value = '';
  }

  return (
    <div className="custom-object-creator">
      <button type="button" className={`btn btn-secondary btn-small custom-object-toggle ${open ? 'active' : ''}`} onClick={() => setOpen((prev) => !prev)}>
        {t('mapEditor.addObjectButton')}
      </button>

      {open ? (
        <div className="custom-object-form">
          <div className="custom-object-preview">
            {draft.svgUrl ? (
              <img src={draft.svgUrl} alt="" />
            ) : draft.svgCode ? (
              <div dangerouslySetInnerHTML={{ __html: draft.svgCode }} />
            ) : (
              <div className="custom-object-preview-placeholder">{t('mapEditor.newObjectDefault')}</div>
            )}
          </div>
          <div className="custom-object-grid">
            <label>
              <span>{t('mapEditor.fields.label')}</span>
              <input
                type="text"
                value={draft.label}
                onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
                placeholder={t('mapEditor.fields.label')}
              />
            </label>
            <label>
              <span>{t('mapEditor.fields.width')}</span>
              <input
                type="number"
                value={draft.width}
                min="24"
                step="1"
                onChange={(event) => setDraft((prev) => ({ ...prev, width: Number(event.target.value) || 24 }))}
              />
            </label>
            <label>
              <span>{t('mapEditor.fields.height')}</span>
              <input
                type="number"
                value={draft.height}
                min="24"
                step="1"
                onChange={(event) => setDraft((prev) => ({ ...prev, height: Number(event.target.value) || 24 }))}
              />
            </label>
            <label>
              <span>{t('mapEditor.fields.zIndex')}</span>
              <input
                type="number"
                value={draft.zIndex}
                step="1"
                onChange={(event) => setDraft((prev) => ({ ...prev, zIndex: Number(event.target.value) || 0 }))}
              />
            </label>
          </div>

          <label>
            <span>{t('mapEditor.fields.interactionMode')}</span>
            <select
              value={draft.interactionMode}
              onChange={(event) => setDraft((prev) => ({ ...prev, interactionMode: event.target.value }))}
            >
              <option value="DECOR">Декор</option>
              <option value="SELECTABLE">Вибирається гостем</option>
            </select>
          </label>

          <label>
            <span>{t('mapEditor.fields.svgUrl')}</span>
            <input
              type="url"
              value={draft.svgUrl}
              onChange={(event) => setDraft((prev) => ({ ...prev, svgUrl: event.target.value }))}
              placeholder="https://example.com/object.svg"
            />
          </label>

          <label>
            <span>{t('mapEditor.fields.svgCode')}</span>
            <textarea
              value={draft.svgCode}
              onChange={(event) => setDraft((prev) => ({ ...prev, svgCode: event.target.value, svgUrl: '' }))}
              placeholder="<svg>...</svg>"
              style={{ minHeight: '88px', fontFamily: 'monospace', fontSize: '10px' }}
            />
          </label>

          <label className="btn btn-secondary btn-small texture-upload-button">
            {t('mapEditor.uploadAsset')}
            <input type="file" accept=".svg" onChange={uploadSvg} />
          </label>

          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => onCreate({
              label: draft.label || t('mapEditor.newObjectDefault'),
              width: draft.width,
              height: draft.height,
              zIndex: draft.zIndex,
              interactionMode: draft.interactionMode,
              svgUrl: draft.svgUrl.trim(),
              svgCode: draft.svgCode.trim(),
              isLocked: false
            })}
          >
            {t('mapEditor.createObjectButton')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MapEditorPage() {
  const { t, language } = useAdminI18n();
  const objectIdRef = useRef(0);
  const canvasContainerRef = useRef(null);
  const panStateRef = useRef(null);
  const historyRef = useRef({ past: [], future: [] });
  const clipboardRef = useRef([]);
  const dragStateRef = useRef(null);
  const [mapScale, setMapScale] = useState(1);
  const [mapAutoFit, setMapAutoFit] = useState(true);
  const [textureAssets, setTextureAssets] = useState(loadTextureAssets);
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
    selectedObjectId: null,
    selectedObjectIds: [],
    // V2 State
    activeTab: 'PROPERTIES',
    activeTool: 'SELECT',
    activeCategory: 'SURFACES',
    mapManagementOpen: false,
    drawingPath: null,
    polygonDraft: null
  });

  const handleCanvasMouseDown = (e) => {
    if (editorState.activeTool === 'POLYGON') {
      const point = getCanvasPoint(e, mapScale);
      setEditorState((prev) => ({
        ...prev,
        polygonDraft: {
          points: [...(prev.polygonDraft?.points || []), point],
          cursor: point
        }
      }));
      return;
    }

    if (editorState.activeTool !== 'LINE') return;
    
    const { x, y } = getCanvasPoint(e, mapScale);

    setEditorState(prev => ({
      ...prev,
      drawingPath: {
        id: `tmp-path-${Date.now()}`,
        points: [{ x, y }, { x, y }]
      }
    }));
  };

  const handlePanMouseDown = (event) => {
    if (editorState.activeTool !== 'PAN' || !canvasContainerRef.current) {
      return;
    }

    event.preventDefault();
    panStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: canvasContainerRef.current.scrollLeft,
      scrollTop: canvasContainerRef.current.scrollTop
    };
  };

  const handlePanMouseMove = (event) => {
    if (!panStateRef.current || !canvasContainerRef.current) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - panStateRef.current.x;
    const deltaY = event.clientY - panStateRef.current.y;
    canvasContainerRef.current.scrollLeft = panStateRef.current.scrollLeft - deltaX;
    canvasContainerRef.current.scrollTop = panStateRef.current.scrollTop - deltaY;
  };

  const handlePanMouseUp = () => {
    panStateRef.current = null;
  };

  const handleCanvasMouseMove = (e) => {
    if (editorState.activeTool === 'POLYGON' && editorState.polygonDraft?.points?.length) {
      const point = getCanvasPoint(e, mapScale);
      setEditorState((prev) => ({
        ...prev,
        polygonDraft: prev.polygonDraft ? { ...prev.polygonDraft, cursor: point } : null
      }));
      return;
    }

    if (!editorState.drawingPath) return;

    const { x, y } = getCanvasPoint(e, mapScale);

    setEditorState(prev => ({
      ...prev,
      drawingPath: {
        ...prev.drawingPath,
        points: [prev.drawingPath.points[0], { x, y }]
      }
    }));
  };

  const handleCanvasMouseUp = () => {
    if (editorState.activeTool === 'POLYGON') return;
    if (!editorState.drawingPath) return;

    const p1 = editorState.drawingPath.points[0];
    const p2 = editorState.drawingPath.points[1];
    
    // Calculate bounding box
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.max(Math.abs(p2.x - p1.x), 20);
    const height = Math.max(Math.abs(p2.y - p1.y), 20);
    
    // Coordinates relative to the container
    const relP1 = { x: p1.x - x, y: p1.y - y };
    const relP2 = { x: p2.x - x, y: p2.y - y };
    
    const pathData = `M ${relP1.x} ${relP1.y} L ${relP2.x} ${relP2.y}`;

    createObject('PATH', {
      width,
      height,
      x,
      y,
      label: t('mapEditor.lineDefault'),
      pathData
    });

    setEditorState(prev => ({ ...prev, drawingPath: null }));
  };

  function finishPolygonDraft() {
    const points = editorState.polygonDraft?.points || [];
    if (points.length < 3) {
      setEditorState((prev) => ({ ...prev, polygonDraft: null }));
      return;
    }

    const bounds = getPolygonBounds(points);
    createObject('CUSTOM', {
      label: t('mapEditor.polygonDefault'),
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      subType: 'POLYGON',
      texture: 'sand',
      zIndex: SURFACE_Z_INDEX,
      points: normalizePolygonPoints(points, bounds)
    });

    setEditorState((prev) => ({ ...prev, polygonDraft: null, activeTool: 'SELECT' }));
  }

  function cancelPolygonDraft() {
    setEditorState((prev) => ({ ...prev, polygonDraft: null }));
  }

  async function handleTextureUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('folder', 'menu');
    formData.append('image', file);

    const result = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: formData
    });

    if (result.response.ok && result.body?.url) {
      setTextureAssets((prev) => [
        {
          id: `texture-${Date.now()}`,
          name: file.name,
          url: result.body.url
        },
        ...prev
      ]);
    } else {
      alert(result.body?.message || 'Upload failed');
    }

    event.target.value = '';
  }

  function applyTextureToSelected(textureUrl) {
    if (!selectedObject) return;
    handleFieldChange('textureUrl', textureUrl);
    handleFieldChange('texture', '');
  }

  function deleteTextureAsset(assetId) {
    setTextureAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }

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
    localStorage.setItem(TEXTURE_ASSETS_STORAGE_KEY, JSON.stringify(textureAssets));
  }, [textureAssets]);

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
    historyRef.current = { past: [], future: [] };

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
      selectedObjectId: nextData.objects[0]?.id || null,
      selectedObjectIds: nextData.objects[0]?.id ? [nextData.objects[0].id] : []
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
  const selectedObjects = useMemo(
    () => objects.filter((object) => editorState.selectedObjectIds.includes(object.id)),
    [objects, editorState.selectedObjectIds]
  );
  const hasChanges = useMemo(() => {
    if (!editorState.original || !editorState.current) {
      return false;
    }

    return JSON.stringify(editorState.original) !== JSON.stringify(editorState.current);
  }, [editorState.current, editorState.original]);

  useEffect(() => {
    function handleKeyDown(event) {
      const tagName = event.target?.tagName;
      const isEditableTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || event.target?.isContentEditable;
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (ctrl && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redoChange();
        } else {
          undoChange();
        }
        return;
      }

      if (ctrl && key === 'c') {
        if (!isEditableTarget) {
          event.preventDefault();
          copySelection();
        }
        return;
      }

      if (ctrl && key === 'v') {
        if (!isEditableTarget) {
          event.preventDefault();
          pasteSelection();
        }
        return;
      }

      if (ctrl && key === 'a' && !isEditableTarget) {
        event.preventDefault();
        if (objects.length) {
          setSelection(objects.map((object) => object.id), { activeTab: 'PROPERTIES' });
        }
        return;
      }

      if (isEditableTarget) {
        return;
      }

      if (['Delete', 'Backspace'].includes(event.key) && selectedObjects.length) {
        event.preventDefault();
        handleDeleteSelected();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [objects, selectedObjects, selectedObject, editorState.current, t]);

  function setSelection(ids, options = {}) {
    const nextIds = normalizeSelectionIds(ids);
    setEditorState((prev) => ({
      ...prev,
      selectedObjectId: nextIds[0] || null,
      selectedObjectIds: nextIds,
      activeTab: options.activeTab || prev.activeTab
    }));
  }

  function fitMapToViewport() {
    setMapAutoFit(true);
    setMapScale(calculateFitScale(canvasContainerRef.current, map));
  }

  function changeMapScale(delta) {
    setMapAutoFit(false);
    setMapScale((current) => clampScale(current + delta));
  }

  useEffect(() => {
    if (!map || editorState.loading || !mapAutoFit) {
      return undefined;
    }

    const container = canvasContainerRef.current;
    if (!container) {
      return undefined;
    }

    const updateScale = () => {
      setMapScale(calculateFitScale(container, map));
    };

    const frameId = window.requestAnimationFrame(updateScale);
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [map?.id, map?.width, map?.height, editorState.loading, mapAutoFit]);

  function pushHistorySnapshot(snapshot) {
    historyRef.current.past.push(cloneEditorSnapshot(snapshot));
    historyRef.current.future = [];
  }

  function snapshotState(state) {
    return {
      current: cloneEditorSnapshot(state.current),
      selectedObjectId: state.selectedObjectId,
      selectedObjectIds: [...(state.selectedObjectIds || [])],
      activeTab: state.activeTab
    };
  }

  function updateCurrent(updater, options = {}) {
    setEditorState((prev) => {
      if (!prev.current?.map) {
        return prev;
      }

      const next = updater(prev);
      const shouldTrackHistory = options.recordHistory !== false && next?.current && next.current !== prev.current;

      if (shouldTrackHistory) {
        pushHistorySnapshot(snapshotState(prev));
      }

      return {
        ...prev,
        ...next,
        saveMessage: '',
        error: ''
      };
    });
  }

  function undoChange() {
    setEditorState((prev) => {
      const snapshot = historyRef.current.past.pop();
      if (!snapshot) {
        return prev;
      }

      historyRef.current.future.push(snapshotState(prev));
      return {
        ...prev,
        current: snapshot.current,
        selectedObjectId: snapshot.selectedObjectId || null,
        selectedObjectIds: normalizeSelectionToObjects(snapshot.selectedObjectIds, snapshot.current.objects),
        activeTab: snapshot.activeTab || prev.activeTab,
        saveMessage: '',
        error: ''
      };
    });
  }

  function redoChange() {
    setEditorState((prev) => {
      const snapshot = historyRef.current.future.pop();
      if (!snapshot) {
        return prev;
      }

      historyRef.current.past.push(snapshotState(prev));
      return {
        ...prev,
        current: snapshot.current,
        selectedObjectId: snapshot.selectedObjectId || null,
        selectedObjectIds: normalizeSelectionToObjects(snapshot.selectedObjectIds, snapshot.current.objects),
        activeTab: snapshot.activeTab || prev.activeTab,
        saveMessage: '',
        error: ''
      };
    });
  }

  function copySelection() {
    const source = selectedObjects.length ? selectedObjects : selectedObject ? [selectedObject] : [];
    clipboardRef.current = cloneEditorSnapshot(source);
  }

  function pasteSelection() {
    if (!clipboardRef.current.length || !editorState.current?.map) {
      return;
    }

    updateCurrent((prev) => {
      const shift = 24;
      const newObjects = clipboardRef.current.map((object, index) =>
        normalizeObject(
          {
            ...cloneEditorSnapshot(object),
            id: `tmp-${Date.now()}-${objectIdRef.current + index + 1}`,
            x: object.x + shift,
            y: object.y + shift,
            zIndex: Number(object.zIndex) + index + 1
          },
          prev.current.map
        )
      );

      objectIdRef.current += newObjects.length;

      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, ...newObjects]
        },
        selectedObjectId: newObjects[0]?.id || prev.selectedObjectId,
        selectedObjectIds: newObjects.map((object) => object.id),
        activeTab: 'PROPERTIES'
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
        // Мы редактируем UA версию через текстовое поле
        return { ...object, label: { ...wrapLabel(object.label), ua: String(value) } };
      }

      if (META_PROPERTY_FIELDS.has(field)) {
        return { ...object, metaJson: { ...object.metaJson, [field]: String(value) } };
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

      if (field === 'isLocked') {
        return {
          ...object,
          metaJson: {
            ...object.metaJson,
            isLocked: Boolean(value)
          }
        };
      }

      const numericValue = Number(value);
      return {
        ...object,
        [field]: Number.isFinite(numericValue) ? numericValue : object[field]
      };
    });
  }

  function wrapLabel(label) {
    if (typeof label === 'object' && label !== null && label.ua !== undefined) return label;
    return { ua: String(label || ''), ru: '', en: '' };
  }

  function handleMapFieldChange(field, value) {
    updateCurrent((prev) => ({
      current: {
        ...prev.current,
        map: {
          ...prev.current.map,
          [field]: field === 'width' || field === 'height'
            ? Math.max(roundCoordinate(value), 100)
            : String(value)
        }
      }
    }));
  }

  function handleObjectMouseDown(objectId, event) {
    if (event.button !== 0) {
      return;
    }

    const isMultiSelect = event.ctrlKey || event.metaKey;
    const nextIds = isMultiSelect
      ? (editorState.selectedObjectIds.includes(objectId)
        ? editorState.selectedObjectIds.filter((id) => id !== objectId)
        : [...editorState.selectedObjectIds, objectId])
      : [objectId];

    setSelection(nextIds, { activeTab: 'PROPERTIES' });
  }

  function handleObjectContextMenu(objectId, event) {
    event.preventDefault();
    setSelection([objectId], { activeTab: 'PROPERTIES' });
  }

  function beginDragGroup(objectId, position) {
    const draggableObjects = (editorState.selectedObjectIds.includes(objectId) ? selectedObjects : [selectedObject || objects.find((item) => item.id === objectId)].filter(Boolean))
      .filter((item) => !item.metaJson?.isLocked);

    if (!editorState.selectedObjectIds.includes(objectId)) {
      setSelection([objectId], { activeTab: 'PROPERTIES' });
    }

    dragStateRef.current = {
      objectId,
      startX: position.x,
      startY: position.y,
      before: snapshotState(editorState),
      positions: new Map(draggableObjects.map((item) => [item.id, { x: item.x, y: item.y }]))
    };
  }

  function updateDragGroup(objectId, position) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.objectId !== objectId) {
      return;
    }

    const deltaX = roundCoordinate(position.x - dragState.startX);
    const deltaY = roundCoordinate(position.y - dragState.startY);
    updateCurrent((prev) => ({
      current: {
        ...prev.current,
        objects: prev.current.objects.map((object) => {
          const start = dragState.positions.get(object.id);
          if (!start) {
            return object;
          }

          return normalizeObject(
            {
              ...object,
              x: start.x + deltaX,
              y: start.y + deltaY
            },
            prev.current.map
          );
        })
      }
    }), { recordHistory: false });
  }

  function endDragGroup(objectId, position) {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;

    if (!dragState || dragState.objectId !== objectId) {
      return;
    }

    if (dragState.startX !== position.x || dragState.startY !== position.y) {
      pushHistorySnapshot(dragState.before);
    }
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

  function moveSelectedLayer(action) {
    if (!selectedObjects.length) {
      return;
    }

    updateCurrent((prev) => {
      const zIndexes = prev.current.objects.map((object) => Number(object.zIndex) || 0);
      const maxZIndex = Math.max(...zIndexes, 0);
      const selectedIds = new Set(selectedObjects.map((object) => object.id));

      const nextObjects = prev.current.objects.map((object) => {
        if (!selectedIds.has(object.id)) {
          return object;
        }

        const currentZIndex = Number(object.zIndex) || 0;
        let zIndex = currentZIndex;

        if (action === 'bottom') zIndex = 0;
        if (action === 'back') zIndex = Math.max(currentZIndex - 1, 0);
        if (action === 'front') zIndex = currentZIndex + 1;
        if (action === 'top') zIndex = maxZIndex + 1;

        return normalizeObject({ ...object, zIndex }, prev.current.map);
      });

      return {
        current: {
          ...prev.current,
          objects: nextObjects
        }
      };
    });
  }

  function buildNewObject(type, currentMap, currentObjects, meta = {}) {
    const preset = CREATION_PRESETS[type] || CREATION_PRESETS.DECOR;
    const maxZIndex = currentObjects.reduce((max, object) => Math.max(max, Number(object.zIndex) || 0), 0);
    const width = meta.width || preset.width;
    const height = meta.height || preset.height;
    const zIndex = meta.zIndex !== undefined ? Number(meta.zIndex) : maxZIndex + 1;
    
    // Use provided coordinates or center on map
    const x = meta.x !== undefined ? meta.x : Math.round((currentMap.width - width) / 2);
    const y = meta.y !== undefined ? meta.y : Math.round((currentMap.height - height) / 2);

    objectIdRef.current += 1;

    return normalizeObject(
      {
        id: `tmp-${Date.now()}-${objectIdRef.current}`,
        type,
        label: { ua: meta.label || (type === 'LABEL' ? t('mapEditor.newLabelDefault') : ''), ru: '', en: '' },
        tableId: null,
        x,
        y,
        width,
        height,
        rotation: 0,
        zIndex,
        isActive: true,
    metaJson: { 
          interactionMode: meta.interactionMode || (meta.subType === 'BED' ? 'SELECTABLE' : 'DECOR'),
          subType: meta.subType,
          pathData: meta.pathData,
          points: meta.points,
          texture: meta.texture,
          textureUrl: meta.textureUrl,
          opacity: meta.opacity,
          strokeColor: meta.strokeColor,
          strokeWidth: meta.strokeWidth,
          svgUrl: meta.svgUrl,
          svgCode: meta.svgCode,
          isLocked: Boolean(meta.isLocked)
        }
      },
      currentMap
    );
  }

  function createObject(type, meta = {}) {
    updateCurrent((prev) => {
      const newObject = buildNewObject(type, prev.current.map, prev.current.objects, meta);
      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, newObject]
        },
        selectedObjectId: newObject.id,
        selectedObjectIds: [newObject.id],
        activeTab: 'PROPERTIES'
      };
    });
  }

  function createSurfacePreset(preset) {
    updateCurrent((prev) => {
      const newObject = buildNewObject(preset.objectType, prev.current.map, prev.current.objects);
      newObject.label = { ua: preset.objectLabel, ru: '', en: '' };
      newObject.width = preset.width;
      newObject.height = preset.height;

      const normalizedObject = normalizeObject(newObject, prev.current.map);
      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, normalizedObject]
        },
        selectedObjectId: normalizedObject.id,
        selectedObjectIds: [normalizedObject.id],
        activeTab: 'PROPERTIES'
      };
    });
  }

  function duplicateSelected() {
    if (!selectedObjects.length || !editorState.current?.map) {
      return;
    }

    updateCurrent((prev) => {
      const baseZIndex = prev.current.objects.reduce((max, object) => Math.max(max, Number(object.zIndex) || 0), 0) + 1;
      const duplicates = selectedObjects.map((object, index) => normalizeObject(
        {
          ...cloneEditorSnapshot(object),
          id: `tmp-${Date.now()}-${objectIdRef.current + index + 1}`,
          x: object.x + 24,
          y: object.y + 24,
          zIndex: baseZIndex + index
        },
        prev.current.map
      ));

      objectIdRef.current += duplicates.length;

      return {
        current: {
          ...prev.current,
          objects: [...prev.current.objects, ...duplicates]
        },
        selectedObjectId: duplicates[0]?.id || prev.selectedObjectId,
        selectedObjectIds: duplicates.map((object) => object.id),
        activeTab: 'PROPERTIES'
      };
    });
  }

  function handleDeleteSelected() {
    if (!selectedObjects.length) {
      return;
    }

    const confirmed = window.confirm(
      selectedObjects.length > 1
        ? t('mapEditor.deleteManyConfirm', { count: selectedObjects.length })
        : t('mapEditor.deleteConfirm', { name: getObjectDisplayName(selectedObjects[0], tableMap, t, language) })
    );
    if (!confirmed) {
      return;
    }

    updateCurrent((prev) => {
      const selectedIds = new Set(selectedObjects.map((object) => object.id));
      const nextObjects = prev.current.objects.filter((object) => !selectedIds.has(object.id));
      return {
        current: {
          ...prev.current,
          objects: nextObjects
        },
        selectedObjectId: getNextSelectionId(nextObjects),
        selectedObjectIds: nextObjects[0] ? [nextObjects[0].id] : [],
        activeTab: 'PROPERTIES'
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
        width: editorState.current.map.width,
        height: editorState.current.map.height,
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
        styleJson: object.styleJson || null,
        metaJson: object.metaJson || null,
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
          : prev.original.objects[0]?.id || null,
        selectedObjectIds: prev.original.objects.some((object) => object.id === prev.selectedObjectId)
          ? normalizeSelectionToObjects(prev.selectedObjectIds, prev.original.objects)
          : (prev.original.objects[0]?.id ? [prev.original.objects[0].id] : [])
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
      name: baseName, // Бэкенд обернет это в {ua, ru, en}
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
    historyRef.current = { past: [], future: [] };

    setEditorState((prev) => ({
      ...prev,
      creatingMap: false,
      maps,
      defaultMapId: Number(result.body.map.id),
      selectedMapId: Number(result.body.map.id),
      original: nextData,
      current: nextData,
      selectedObjectId: nextData.objects[0]?.id || null,
      selectedObjectIds: nextData.objects[0]?.id ? [nextData.objects[0].id] : [],
      newMapName: '',
      newMapDescription: '',
      makeNewMapDefault: false,
      saveMessage: t('mapEditor.mapCreatedSuccess')
    }));
  }

  async function deleteCurrentMap() {
    if (!editorState.selectedMapId) {
      return;
    }

    const selectedMap = editorState.maps.find((item) => Number(item.id) === Number(editorState.selectedMapId));
    const name = localizeField(selectedMap?.name, language) || selectedMap?.slug || editorState.selectedMapId;
    if (!window.confirm(t('mapEditor.deleteMapConfirm', { name }))) {
      return;
    }

    setEditorState((prev) => ({ ...prev, saving: true, error: '', saveMessage: '' }));
    const result = await apiRequest(`/api/admin/maps/${editorState.selectedMapId}`, { method: 'DELETE' });
    if (!result.response.ok) {
      setEditorState((prev) => ({
        ...prev,
        saving: false,
        error: result.body?.message || t('mapEditor.errors.deleteMap')
      }));
      return;
    }

    await loadInitialMapEditor();
    setEditorState((prev) => ({
      ...prev,
      saving: false,
      saveMessage: t('mapEditor.mapDeletedSuccess')
    }));
  }

  return (
    <AdminLayout>
      <PageContainer title={t('mapEditor.title')} description={t('mapEditor.description')} className="map-editor-page">
        <section className="page-hero compact map-editor-hero">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('mapEditor.eyebrow')}</span>
            <h3>{t('mapEditor.heroTitle')}</h3>
            <p className="muted">{t('mapEditor.heroDescription')}</p>
          </div>
          <div className="hero-inline-note">{t('mapEditor.editorNote')}</div>
        </section>

        <div className="map-editor-toolbar" style={{ marginBottom: '16px' }}>
          <div className="map-editor-toolbar-group">
            <button type="button" className="btn" onClick={saveChanges} disabled={!hasChanges || editorState.saving || editorState.loading}>
              {editorState.saving ? t('mapEditor.saving') : t('mapEditor.save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetChanges} disabled={!hasChanges || editorState.saving || editorState.loading}>
              {t('mapEditor.reset')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={undoChange} disabled={!historyRef.current.past.length || editorState.loading}>
              {t('mapEditor.undo')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={redoChange} disabled={!historyRef.current.future.length || editorState.loading}>
              {t('mapEditor.redo')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={copySelection} disabled={!selectedObjects.length || editorState.loading}>
              {t('mapEditor.copy')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={pasteSelection} disabled={editorState.loading}>
              {t('mapEditor.paste')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditorState((prev) => ({ ...prev, mapManagementOpen: !prev.mapManagementOpen }))}
              disabled={editorState.loading}
            >
              {t('mapEditor.manageMaps')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditorState((prev) => ({ ...prev, activeTab: 'ASSETS' }))}
              disabled={editorState.loading}
            >
              {t('mapEditor.addObjects')}
            </button>
            <div className="separator" style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 12px' }} />
            <select
                value={editorState.selectedMapId || ''}
                onChange={(event) => handleMapSelectionChange(event.target.value)}
                disabled={editorState.loading || editorState.mapsLoading || editorState.saving}
                style={{ minWidth: '200px' }}
              >
                {(editorState.maps || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizeField(item.name, language)} ({item.slug}){item.isDefault ? ` • ${t('mapEditor.defaultMapBadge')}` : ''}
                  </option>
                ))}
              </select>
            <div className="map-editor-zoom-controls" aria-label="Map zoom controls">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => changeMapScale(-MAP_SCALE_STEP)}>
                -
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={fitMapToViewport}>
                {t('mapEditor.zoomFit')}
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => {
                setMapAutoFit(false);
                setMapScale(1);
              }}>
                {t('mapEditor.zoomActual')}
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => changeMapScale(MAP_SCALE_STEP)}>
                +
              </button>
              <span className="map-editor-zoom-value">{Math.round(mapScale * 100)}%</span>
            </div>
          </div>

          <div className="map-editor-toolbar-group">
            {map && (
               <div className="map-meta muted" style={{ margin: 0 }}>
               {t('mapEditor.meta', {
                 map: localizeField(map.name, language) || '—',
                 size: `${map.width}×${map.height}`,
                 objects: objects.length,
                 tables: editorState.current?.tables?.length || 0
               })}
             </div>
            )}
          </div>
        </div>

        {editorState.mapManagementOpen ? (
        <section className="map-management-panel">
          <div className="map-management-grid">
            <label>
              {t('mapEditor.newMapPreset')}
              <select
                value={editorState.newMapPreset}
                onChange={(event) => setEditorState((prev) => ({ ...prev, newMapPreset: event.target.value }))}
                disabled={editorState.creatingMap || editorState.loading}
              >
                {MAP_VARIANT_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>{preset.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('mapEditor.newMapName')}
              <input
                value={editorState.newMapName}
                onChange={(event) => setEditorState((prev) => ({ ...prev, newMapName: event.target.value }))}
                placeholder={t('mapEditor.newMapNamePlaceholder')}
                disabled={editorState.creatingMap || editorState.loading}
              />
            </label>
            <label>
              {t('mapEditor.newMapDescription')}
              <input
                value={editorState.newMapDescription}
                onChange={(event) => setEditorState((prev) => ({ ...prev, newMapDescription: event.target.value }))}
                placeholder={t('mapEditor.newMapDescriptionPlaceholder')}
                disabled={editorState.creatingMap || editorState.loading}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editorState.makeNewMapDefault}
                onChange={(event) => setEditorState((prev) => ({ ...prev, makeNewMapDefault: event.target.checked }))}
                disabled={editorState.creatingMap || editorState.loading}
              />
              {t('mapEditor.makeDefault')}
            </label>
          </div>
          <div className="map-management-actions">
            <button type="button" className="btn btn-secondary btn-small" onClick={createMapVariant} disabled={editorState.creatingMap || editorState.loading || editorState.saving}>
              {editorState.creatingMap ? t('mapEditor.creatingMap') : t('mapEditor.createMap')}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-small"
              onClick={deleteCurrentMap}
              disabled={editorState.loading || editorState.saving || editorState.mapsLoading || editorState.maps.length <= 1 || editorState.maps.find((item) => Number(item.id) === Number(editorState.selectedMapId))?.isDefault}
            >
              {t('mapEditor.deleteMap')}
            </button>
          </div>
        </section>
        ) : null}

        {editorState.loading ? <p>{t('mapEditor.loading')}</p> : null}
        {editorState.error ? <p className="error">{editorState.error}</p> : null}
        {editorState.saveMessage ? <p className="success-text">{editorState.saveMessage}</p> : null}
        {editorState.activeTool === 'POLYGON' ? (
          <div className="map-editor-draft-bar">
            <span>{t('mapEditor.polygonHint', { count: editorState.polygonDraft?.points?.length || 0 })}</span>
            <button type="button" className="btn btn-small" onClick={finishPolygonDraft} disabled={(editorState.polygonDraft?.points?.length || 0) < 3}>
              {t('mapEditor.finishPolygon')}
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={cancelPolygonDraft}>
              {t('mapEditor.cancelPolygon')}
            </button>
          </div>
        ) : null}

        {!editorState.loading && editorState.current ? (
          <div className="map-editor-v2">
            <aside className="map-editor-tools">
              <button 
                className={`tool-button ${editorState.activeTool === 'SELECT' ? 'active' : ''}`}
                onClick={() => setEditorState(prev => ({ ...prev, activeTool: 'SELECT' }))}
                title={t('mapEditor.tools.select')}
              >
                <i className="icon-select">S</i>
                <span>{t('mapEditor.tools.select')}</span>
              </button>
              <button 
                className={`tool-button ${editorState.activeTool === 'PAN' ? 'active' : ''}`}
                onClick={() => setEditorState(prev => ({ ...prev, activeTool: 'PAN' }))}
                title={t('mapEditor.tools.pan')}
              >
                <i className="icon-pan">P</i>
                <span>{t('mapEditor.tools.pan')}</span>
              </button>
              <button 
                className={`tool-button ${editorState.activeTool === 'LINE' ? 'active' : ''}`}
                onClick={() => setEditorState(prev => ({ ...prev, activeTool: 'LINE' }))}
                title={t('mapEditor.tools.line')}
              >
                <i className="icon-line">L</i>
                <span>{t('mapEditor.tools.line')}</span>
              </button>
              <button
                className={`tool-button ${editorState.activeTool === 'POLYGON' ? 'active' : ''}`}
                onClick={() => setEditorState(prev => ({ ...prev, activeTool: 'POLYGON', polygonDraft: null }))}
                title={t('mapEditor.tools.polygon')}
              >
                <i className="icon-polygon">G</i>
                <span>{t('mapEditor.tools.polygon')}</span>
              </button>

              <div className="separator" style={{ width: '40px', height: '1px', background: '#e2e8f0', margin: '12px 0' }} />
              
              <button 
                className={`tool-button ${editorState.activeTab === 'ASSETS' ? 'active' : ''}`}
                onClick={() => setEditorState(prev => ({ ...prev, activeTab: 'ASSETS' }))}
              >
                <i className="icon-assets">A</i>
                <span>{t('mapEditor.tabs.assets')}</span>
              </button>
            </aside>

            <main className="map-editor-viewport">
              <SVGDefinitions />
              <div
                className="map-editor-canvas-container"
                ref={canvasContainerRef}
                onMouseDown={handlePanMouseDown}
                onMouseMove={handlePanMouseMove}
                onMouseUp={handlePanMouseUp}
                onMouseLeave={handlePanMouseUp}
              >
                <div
                  className="map-editor-canvas-scale-layer"
                  style={{
                    width: `${map.width * mapScale}px`,
                    height: `${map.height * mapScale}px`
                  }}
                >
                <div
                  className="map-editor-canvas"
                  style={{
                    width: `${map.width}px`,
                    height: `${map.height}px`,
                    transform: `scale(${mapScale})`,
                    transformOrigin: 'top left',
                    boxShadow: '0 0 40px rgba(0,0,0,0.1)',
                    position: 'relative',
                    cursor: ['LINE', 'POLYGON'].includes(editorState.activeTool) ? 'crosshair' : (editorState.activeTool === 'PAN' ? 'grab' : 'default')
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
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

                  {editorState.drawingPath && (
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 9999 }}>
                      <line 
                        x1={editorState.drawingPath.points[0].x} 
                        y1={editorState.drawingPath.points[0].y} 
                        x2={editorState.drawingPath.points[1].x} 
                        y2={editorState.drawingPath.points[1].y} 
                        stroke="#3b82f6" 
                        strokeWidth="3" 
                        strokeDasharray="4,4"
                      />
                    </svg>
                  )}

                  {editorState.polygonDraft?.points?.length ? (
                    <svg className="map-editor-draft-overlay">
                      <polyline
                        points={pointsToSvg([...(editorState.polygonDraft.points || []), editorState.polygonDraft.cursor].filter(Boolean))}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeDasharray="6,6"
                      />
                      {editorState.polygonDraft.points.length >= 3 ? (
                        <polygon
                          points={pointsToSvg(editorState.polygonDraft.points)}
                          fill="rgba(37, 99, 235, 0.14)"
                          stroke="none"
                        />
                      ) : null}
                      {editorState.polygonDraft.points.map((point, index) => (
                        <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="5" fill="#2563eb" />
                      ))}
                    </svg>
                  ) : null}

                  {objects.map((object) => {
                    return (
                      <Rnd
                        key={object.id}
                        bounds="parent"
                        size={{ width: object.width, height: object.height }}
                        position={{ x: object.x, y: object.y }}
                        onDragStart={(_, data) => beginDragGroup(object.id, data)}
                        onDrag={(_, data) => updateDragGroup(object.id, data)}
                        onDragStop={(_, data) => endDragGroup(object.id, data)}
                        onResizeStop={(_, __, ref, ___, position) =>
                          handleResizeStop(object.id, position, {
                            width: ref.offsetWidth,
                            height: ref.offsetHeight
                          })
                        }
                        onMouseDown={(event) => {
                          if (editorState.activeTool === 'SELECT') {
                            handleObjectMouseDown(object.id, event);
                          }
                        }}
                        onContextMenu={(event) => handleObjectContextMenu(object.id, event)}
                        enableResizing={editorState.activeTool === 'SELECT' && !object.metaJson?.isLocked}
                        disableDragging={editorState.activeTool !== 'SELECT' || Boolean(object.metaJson?.isLocked)}
                        dragGrid={[1, 1]}
                        resizeGrid={[1, 1]}
                        scale={mapScale}
                        className={`map-editor-rnd ${editorState.selectedObjectIds.includes(object.id) ? 'selected' : ''}`}
                        style={{ zIndex: object.zIndex }}
                      >
                        <MapObjectRenderer
                          object={object}
                          isSelected={editorState.selectedObjectIds.includes(object.id)}
                          tableMap={tableMap}
                          zoneMap={zoneMap}
                          t={t}
                          language={language}
                        />
                      </Rnd>
                    );
                  })}
                </div>
                </div>
              </div>
            </main>

            <aside className="map-editor-inspector">
              <div className="inspector-tabs">
                <button
                  type="button"
                  className={`inspector-tab ${editorState.activeTab === 'PROPERTIES' ? 'active' : ''}`}
                  onClick={() => setEditorState(prev => ({ ...prev, activeTab: 'PROPERTIES' }))}
                >
                  {t('mapEditor.tabs.properties')}
                </button>
                <button
                  type="button"
                  className={`inspector-tab ${editorState.activeTab === 'LAYERS' ? 'active' : ''}`}
                  onClick={() => setEditorState(prev => ({ ...prev, activeTab: 'LAYERS' }))}
                >
                  {t('mapEditor.tabs.layers')}
                </button>
                <button
                  type="button"
                  className={`inspector-tab ${editorState.activeTab === 'ASSETS' ? 'active' : ''}`}
                  onClick={() => setEditorState(prev => ({ ...prev, activeTab: 'ASSETS' }))}
                >
                  {t('mapEditor.tabs.assets')}
                </button>
              </div>

              <div className="inspector-content">
                {editorState.activeTab === 'PROPERTIES' && (
                  <>
                    <MapObjectProperties
                      selectedObject={selectedObject}
                      tableMap={tableMap}
                      zoneMap={zoneMap}
                      tables={editorState.current.tables}
                      onFieldChange={handleFieldChange}
                      onDuplicate={duplicateSelected}
                      onDelete={handleDeleteSelected}
                      onLayerAction={moveSelectedLayer}
                      onSave={saveChanges}
                      t={t}
                      language={language}
                    />
                    <details className="map-settings-accordion">
                      <summary>
                        <div>
                          <strong>{t('mapEditor.mapSettingsTitle')}</strong>
                          <span className="muted small">{t('mapEditor.mapSettingsDescription')}</span>
                        </div>
                      </summary>
                      <MapSettings map={map} onMapFieldChange={handleMapFieldChange} t={t} />
                    </details>
                  </>
                )}

                {editorState.activeTab === 'LAYERS' && (
                  <LayerManager 
                    objects={objects}
                    selectedObjectId={editorState.selectedObjectId}
                    onSelect={(id) => setEditorState(prev => ({ ...prev, selectedObjectId: id, activeTab: 'PROPERTIES' }))}
                    tableMap={tableMap}
                    t={t}
                    language={language}
                  />
                )}

                {editorState.activeTab === 'ASSETS' && (
                  <div className="asset-browser">
                    <TextureLibrary
                      textureAssets={textureAssets}
                      selectedObject={selectedObject}
                      onUpload={handleTextureUpload}
                      onApply={applyTextureToSelected}
                      onDelete={deleteTextureAsset}
                      t={t}
                    />

                    <div className="category-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {Object.keys(ASSET_CATEGORIES).map(catKey => (
                        <button
                          type="button"
                          key={catKey}
                          className={`btn btn-small ${editorState.activeCategory === catKey ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setEditorState(prev => ({ ...prev, activeCategory: catKey }))}
                        >
                          {ASSET_CATEGORIES[catKey].label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="asset-library">
                      {ASSET_CATEGORIES[editorState.activeCategory].items.map((item, idx) => (
                        <button key={idx} type="button" className="asset-item" onClick={() => createObject(item.type, item)}>
                          <div className="asset-preview">
                            {item.subType && SVG_TEMPLATES[item.subType] ? (
                              <svg viewBox="0 0 100 100" style={{ width: '30px', height: '30px' }}>
                                {SVG_TEMPLATES[item.subType]}
                              </svg>
                            ) : (
                              <div className={`editor-object-badge ${item.type.toLowerCase()}`} style={{ width: '30px', height: '20px' }} />
                            )}
                          </div>
                          <span className="asset-label">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    <CustomObjectCreator
                      onCreate={(meta) => createObject('CUSTOM', {
                        ...meta,
                        subType: meta.svgCode || meta.svgUrl ? 'SVG' : meta.subType,
                        texture: '',
                        opacity: 1
                      })}
                      t={t}
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
