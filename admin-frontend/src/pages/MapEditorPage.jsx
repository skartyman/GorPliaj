import { useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import EditorToolbar from '../components/map-editor/EditorToolbar';
import LeftSidebar from '../components/map-editor/LeftSidebar';
import InspectorPanel from '../components/map-editor/InspectorPanel';
import SceneViewport from '../components/map-editor/SceneViewport';
import StatusBar from '../components/map-editor/StatusBar';
import { clampObject, downloadJson, duplicateObject } from '../components/map-editor/editor-utils';
import { createStarterDocument } from '../lib/map-schema';
import { saveDraftDocument, loadDraftDocument, publishDocument } from '../lib/map-editor-storage';
import { getDefaultVisualConfigForObject } from '../lib/editor-assets';
import { t } from '../lib/editor-locale';

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toRenderableObjects(document) {
  return [
    ...document.territoryObjects.map((item) => ({ ...item, kind: 'territory' })),
    ...document.bookableObjects.map((item) => ({ ...item, kind: 'bookable' }))
  ].sort((a, b) => a.zIndex - b.zIndex);
}

const TERRITORY_TOOL_PRESETS = {
  addSea: { type: 'sea', name: 'Море', fill: '#1d4ed8', stroke: '#1e40af', x: 0, y: 0, width: 1800, height: 360, zIndex: 1 },
  addSand: { type: 'sand', name: 'Песок', fill: '#a16207', stroke: '#78350f', x: 0, y: 320, width: 1800, height: 460, zIndex: 2 },
  addDeck: { type: 'deck', name: 'Настил', fill: '#7c2d12', stroke: '#78350f', width: 760, height: 210, x: 520, y: 650, zIndex: 3 },
  addPathway: { type: 'pathway', name: 'Дорожка', fill: '#475569', stroke: '#64748b', width: 280, height: 320, x: 760, y: 340, zIndex: 4 },
  addStairs: { type: 'stairs', name: 'Лестница', fill: '#334155', stroke: '#64748b', width: 130, height: 60 },
  addPier: { type: 'pier', name: 'Пирс', fill: '#78350f', stroke: '#92400e', width: 420, height: 140, x: 1240, y: 180, zIndex: 5 },
  addBuilding: { type: 'building', name: 'Здание', fill: '#1f2937', stroke: '#475569', width: 260, height: 170 },
  addWinterRestaurant: { type: 'winter_restaurant', name: 'Зимний ресторан', fill: '#312e81', stroke: '#4338ca', width: 280, height: 180 },
  addBar: { type: 'bar', name: 'Бар', fill: '#7c3aed', stroke: '#6d28d9', width: 170, height: 95 },
  addStage: { type: 'stage', name: 'Сцена', fill: '#7f1d1d', stroke: '#b91c1c', width: 220, height: 120 }
};

const BOOKABLE_TOOL_PRESETS = {
  addRoundTable: { objectType: 'round_table', bookingKind: 'restaurant_table', name: 'Стол ресторана', tableCode: 'R' },
  addRectTable: { objectType: 'rect_table', bookingKind: 'terrace_table', name: 'Стол террасы', tableCode: 'T' },
  addSofa: { objectType: 'sofa', bookingKind: 'vip_zone', name: 'Диван', width: 130, height: 74 },
  addLoungerBed: { objectType: 'lounger_bed', bookingKind: 'lounger_bed', name: 'Лежак', width: 130, height: 62 },
  addBungalow: { objectType: 'bungalow', bookingKind: 'bungalow', name: 'Бунгало', width: 130, height: 100 },
  addHookahTable: { objectType: 'hookah_table', bookingKind: 'hookah_table', name: 'Кальянный стол', width: 92, height: 92 },
  addVipZone: { objectType: 'vip_zone', bookingKind: 'vip_zone', name: 'VIP-зона', width: 180, height: 100 },
  addTicketZone: { objectType: 'ticket_zone', bookingKind: 'ticket_zone', name: 'Билетная зона', width: 180, height: 90 },
  addPierSpot: { objectType: 'pier_bed', bookingKind: 'pier_spot', name: 'Место на пирсе', width: 120, height: 58 }
};

function getDefaultObjectByTool(tool, editorMode) {
  const base = {
    x: 220,
    y: 200,
    width: 120,
    height: 70,
    rotation: 0,
    zIndex: 10,
    locked: false,
    hidden: false,
    visibleInLayoutModes: 'all',
    label: ''
  };

  const bookablePreset = BOOKABLE_TOOL_PRESETS[tool];
  if (editorMode === 'bookable' || bookablePreset) {
    const preset = bookablePreset || BOOKABLE_TOOL_PRESETS.addRoundTable;
    const object = {
      ...base,
      ...preset,
      id: nextId('bookable'),
      kind: 'bookable',
      capacityMin: 2,
      capacityMax: 4,
      combinable: false
    };

    return {
      ...object,
      visual: getDefaultVisualConfigForObject({ kind: 'bookable', objectType: object.objectType })
    };
  }

  const territoryPreset = TERRITORY_TOOL_PRESETS[tool] || { type: 'rect', name: 'Объект территории', fill: '#334155', stroke: '#475569' };
  const object = {
    ...base,
    ...territoryPreset,
    id: nextId('territory'),
    kind: 'territory',
    strokeWidth: 1
  };

  return {
    ...object,
    visual: getDefaultVisualConfigForObject({ kind: 'territory', type: object.type })
  };
}

export default function MapEditorPage() {
  const [document, setDocument] = useState(() => loadDraftDocument() || createStarterDocument());
  const [selectedId, setSelectedId] = useState(null);
  const [leftTab, setLeftTab] = useState('objects');
  const [editorMode, setEditorMode] = useState('territory');
  const [activeTool, setActiveTool] = useState('select');
  const [layoutCode, setLayoutCode] = useState(document.layoutModes[0]?.code || 'day_beach_restaurant');
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const objects = useMemo(() => toRenderableObjects(document), [document]);
  const selectedObject = useMemo(() => objects.find((item) => item.id === selectedId) || null, [objects, selectedId]);
  const layoutMode = useMemo(() => document.layoutModes.find((mode) => mode.code === layoutCode), [document.layoutModes, layoutCode]);

  function applyDocumentUpdate(updater) {
    setDocument((prev) => {
      const next = updater(prev);
      setHistory((current) => [...current.slice(-39), prev]);
      setFuture([]);
      return next;
    });
  }

  function setObjects(nextObjects) {
    applyDocumentUpdate((prev) => ({
      ...prev,
      territoryObjects: nextObjects.filter((item) => item.kind === 'territory').map(({ kind, ...item }) => item),
      bookableObjects: nextObjects.filter((item) => item.kind === 'bookable').map(({ kind, ...item }) => item)
    }));
  }

  function addByTool(tool) {
    const object = getDefaultObjectByTool(tool, editorMode);
    setObjects([...objects, clampObject(object, document)]);
    setSelectedId(object.id);
  }

  function handleToolSelect(tool) {
    setActiveTool(tool);
    if (tool !== 'select' && tool !== 'hand') {
      addByTool(tool);
    }
  }

  function updateObject(objectId, patch) {
    const next = objects.map((item) => (item.id === objectId ? clampObject({ ...item, ...patch }, document) : item));
    setObjects(next);
  }

  function handleMoveResize(objectId, patch) {
    updateObject(objectId, patch);
  }

  function handleRotate(objectId, delta) {
    const current = objects.find((item) => item.id === objectId);
    if (!current) return;
    updateObject(objectId, { rotation: Number(current.rotation || 0) + delta });
  }

  function handleDuplicate() {
    if (!selectedObject) return;
    const duplicated = duplicateObject(selectedObject, nextId(selectedObject.kind));
    setObjects([...objects, duplicated]);
    setSelectedId(duplicated.id);
  }

  function handleDelete() {
    if (!selectedObject) return;
    const next = objects.filter((item) => item.id !== selectedObject.id);
    setObjects(next);
    setSelectedId(next[0]?.id || null);
  }

  function handleReorder(objectId, delta) {
    const index = objects.findIndex((item) => item.id === objectId);
    if (index < 0) return;
    const target = index + delta;
    if (target < 0 || target >= objects.length) return;
    const next = [...objects];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setObjects(next.map((item, idx) => ({ ...item, zIndex: idx + 1 })));
  }

  function handleSaveDraft() {
    saveDraftDocument(document);
  }

  function handlePublish() {
    publishDocument(document);
  }

  function handleExport() {
    downloadJson(`${document.id}.json`, document);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    setDocument(parsed);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
  }

  function handleUndo() {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const previous = prev[prev.length - 1];
      setFuture((items) => [document, ...items]);
      setDocument(previous);
      return prev.slice(0, -1);
    });
  }

  function handleRedo() {
    setFuture((prev) => {
      if (!prev.length) return prev;
      const [next, ...rest] = prev;
      setHistory((items) => [...items, document]);
      setDocument(next);
      return rest;
    });
  }

  function handleKeyDown(event) {
    const hotkey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd';
    const undo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
    const redo = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z';

    if (['Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      handleDelete();
    } else if (event.key === 'Escape') {
      setSelectedId(null);
    } else if (hotkey) {
      event.preventDefault();
      handleDuplicate();
    } else if (undo) {
      event.preventDefault();
      handleUndo();
    } else if (redo) {
      event.preventDefault();
      handleRedo();
    }
  }

  function handlePanMove(event) {
    if (activeTool !== 'hand' || !isPanning) return;
    setPan((prev) => ({ x: prev.x + event.movementX, y: prev.y + event.movementY }));
  }

  return (
    <AdminLayout>
      <PageContainer title={t('editor.pageTitle')} description={t('editor.pageDescription')}>
        <div className="floor-plan-editor" onKeyDown={handleKeyDown} tabIndex={0}>
          <EditorToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
            editorMode={editorMode}
            onModeChange={setEditorMode}
            layoutCode={layoutCode}
            layoutModes={document.layoutModes}
            onLayoutChange={setLayoutCode}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            onExport={handleExport}
            onImport={handleImport}
            onLoadDraft={() => {
              setDocument(loadDraftDocument());
              setSelectedId(null);
              setHistory([]);
              setFuture([]);
            }}
          />

          <div className="fp-main-grid">
            <LeftSidebar
              activeTab={leftTab}
              onTabChange={setLeftTab}
              objects={objects}
              zones={document.zones}
              layoutModes={document.layoutModes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggleHidden={(id) => updateObject(id, { hidden: !objects.find((o) => o.id === id)?.hidden })}
              onToggleLocked={(id) => updateObject(id, { locked: !objects.find((o) => o.id === id)?.locked })}
              onReorder={handleReorder}
              previewLayoutCode={layoutCode}
              onPreviewLayoutChange={setLayoutCode}
            />

            <SceneViewport
              map={document}
              objects={objects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveResize={handleMoveResize}
              onRotate={handleRotate}
              layoutMode={layoutMode}
              snapToGrid={snapToGrid}
              gridSize={gridSize}
              zoom={zoom}
              pan={pan}
              onPan={handlePanMove}
              onWheelZoom={(event) => {
                event.preventDefault();
                setZoom((value) => Math.max(0.35, Math.min(2.2, value + (event.deltaY > 0 ? -0.06 : 0.06))));
              }}
            />

            <InspectorPanel
              selectedObject={selectedObject}
              zones={document.zones}
              layoutModes={document.layoutModes}
              onFieldChange={(field, value) => updateObject(selectedObject.id, { [field]: value })}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          </div>

          <div className="fp-controls-row">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setZoom((z) => Math.max(0.35, z - 0.1))}>-</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))}>+</button>
            <button
              type="button"
              className={`btn btn-secondary btn-small ${activeTool === 'hand' ? 'active' : ''}`}
              onMouseDown={() => setIsPanning(true)}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              onClick={() => setActiveTool(activeTool === 'hand' ? 'select' : 'hand')}
            >
              {t('controls.panHand')}
            </button>
            <label className="editor-toggle-field"><span>{t('controls.snapToGrid')}</span><input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} /></label>
          </div>

          <StatusBar document={document} selectedObject={selectedObject} layoutMode={layoutMode} zoom={zoom} mode={editorMode} />
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
