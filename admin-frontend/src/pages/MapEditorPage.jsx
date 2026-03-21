import { useEffect, useMemo, useState } from 'react';
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
  WC: 'wc'
};

const PROPERTY_FIELDS = [
  { key: 'label', type: 'text', step: null },
  { key: 'x', type: 'number', step: 1 },
  { key: 'y', type: 'number', step: 1 },
  { key: 'width', type: 'number', step: 1 },
  { key: 'height', type: 'number', step: 1 },
  { key: 'rotation', type: 'number', step: 1 },
  { key: 'zIndex', type: 'number', step: 1 }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundCoordinate(value) {
  return Math.round(Number(value) || 0);
}

function normalizeObject(object, map) {
  const maxX = Math.max((map?.width || 0) - Number(object.width || 0), 0);
  const maxY = Math.max((map?.height || 0) - Number(object.height || 0), 0);

  return {
    ...object,
    label: object.label || '',
    x: clamp(roundCoordinate(object.x), 0, maxX),
    y: clamp(roundCoordinate(object.y), 0, maxY),
    width: Math.max(roundCoordinate(object.width), 24),
    height: Math.max(roundCoordinate(object.height), 24),
    rotation: roundCoordinate(object.rotation),
    zIndex: roundCoordinate(object.zIndex),
    isActive: Boolean(object.isActive)
  };
}

function buildEditorState(payload) {
  return {
    map: payload.map,
    zones: payload.zones || [],
    tables: payload.tables || [],
    objects: (payload.objects || []).map((object) => normalizeObject(object, payload.map))
  };
}

function getObjectAccent(object) {
  if (object.type === 'TABLE') {
    return 'table';
  }

  return STATIC_TYPE_ACCENTS[object.type] || 'static';
}

function getObjectDisplayName(object, tableMap, t) {
  if (object.type === 'TABLE') {
    const table = tableMap.get(object.tableId);
    return table?.code || table?.name || object.label || t('mapEditor.objectType.TABLE');
  }

  return object.label || t(`mapEditor.objectType.${object.type}`);
}

function MapObjectProperties({ selectedObject, tableMap, zoneMap, onFieldChange, t }) {
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

        <label className="editor-toggle-field">
          <span>{t('mapEditor.fields.isActive')}</span>
          <input
            type="checkbox"
            checked={selectedObject.isActive}
            onChange={(event) => onFieldChange('isActive', event.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}

export default function MapEditorPage() {
  const { t } = useAdminI18n();
  const [editorState, setEditorState] = useState({
    loading: true,
    saving: false,
    error: '',
    saveMessage: '',
    defaultMapId: null,
    original: null,
    current: null,
    selectedObjectId: null
  });

  useEffect(() => {
    loadDefaultMapEditor().catch(() => {
      setEditorState((prev) => ({
        ...prev,
        loading: false,
        error: t('mapEditor.errors.load')
      }));
    });
  }, [t]);

  async function loadDefaultMapEditor() {
    setEditorState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      saveMessage: ''
    }));

    const defaultMapResult = await apiRequest('/api/maps/default');
    if (!defaultMapResult.response.ok || !defaultMapResult.body?.map?.id) {
      setEditorState((prev) => ({
        ...prev,
        loading: false,
        error: defaultMapResult.body?.message || t('mapEditor.errors.load')
      }));
      return;
    }

    const mapId = Number(defaultMapResult.body.map.id);
    const editorResult = await apiRequest(`/api/admin/maps/${mapId}/editor`);

    if (!editorResult.response.ok) {
      setEditorState((prev) => ({
        ...prev,
        loading: false,
        error: editorResult.body?.message || t('mapEditor.errors.load')
      }));
      return;
    }

    const nextData = buildEditorState(editorResult.body);

    setEditorState({
      loading: false,
      saving: false,
      error: '',
      saveMessage: '',
      defaultMapId: mapId,
      original: nextData,
      current: nextData,
      selectedObjectId: nextData.objects[0]?.id || null
    });
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

    return JSON.stringify(editorState.original.objects) !== JSON.stringify(editorState.current.objects);
  }, [editorState.current, editorState.original]);

  function updateObject(objectId, updater) {
    setEditorState((prev) => {
      if (!prev.current?.map) {
        return prev;
      }

      const nextObjects = prev.current.objects.map((object) => {
        if (object.id !== objectId) {
          return object;
        }

        return normalizeObject(updater(object), prev.current.map);
      });

      return {
        ...prev,
        current: {
          ...prev.current,
          objects: nextObjects
        },
        saveMessage: '',
        error: ''
      };
    });
  }

  function handleFieldChange(field, value) {
    if (!selectedObject) {
      return;
    }

    updateObject(selectedObject.id, (object) => {
      if (field === 'label') {
        return { ...object, label: String(value) };
      }

      if (field === 'isActive') {
        return { ...object, isActive: Boolean(value) };
      }

      const numericValue = Number(value);
      return {
        ...object,
        [field]: Number.isFinite(numericValue) ? numericValue : object[field]
      };
    });
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
      objects: editorState.current.objects.map((object) => ({
        id: object.id,
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
      selectedObjectId: prev.selectedObjectId
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
            <button type="button" className="btn" onClick={saveChanges} disabled={!hasChanges || editorState.saving || editorState.loading}>
              {editorState.saving ? t('mapEditor.saving') : t('mapEditor.save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetChanges} disabled={!hasChanges || editorState.saving || editorState.loading}>
              {t('mapEditor.reset')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditorState((prev) => ({ ...prev, selectedObjectId: null }))} disabled={!selectedObject}>
              {t('mapEditor.clearSelection')}
            </button>
          </div>

          <div className="map-editor-toolbar-group">
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

            <PanelCard title={t('mapEditor.propertiesTitle')} subtitle={t('mapEditor.propertiesDescription')} className="full-height surface-muted">
              <MapObjectProperties
                selectedObject={selectedObject}
                tableMap={tableMap}
                zoneMap={zoneMap}
                onFieldChange={handleFieldChange}
                t={t}
              />
            </PanelCard>
          </div>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
