<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { t } from '$lib/stores/i18n';
  import { getPublicMapData } from '$lib/features/map/publicMapAdapter';
  import type { MapObject, MapTable, PublicMapData } from '$lib/features/map/types';
  import {
    clamp,
    clampTranslate,
    getInitialViewTransform,
    getObjectCenter,
    getUsefulContentBounds,
    zoomAroundViewportPoint
  } from '$lib/features/map/viewTransform';

  export let data;

  const MAP_PADDING = 24;
  const PINCH_SENSITIVITY = 0.006;

  let selectedTableId: number | null = null;
  let selectedTable: MapTable | null = null;
  let selectedTableObject: MapObject | null = null;

  let mapResult: { map: PublicMapData; source: 'api' } | null = null;
  let isLoading = true;
  let loadError = '';
  let retryKey = 0;

  let viewportEl: HTMLDivElement | null = null;
  let isMobileViewport = false;
  let isLegendOpen = false;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let initialTransform = { scale: 1, translateX: 0, translateY: 0 };
  let minScale = 0.45;
  let maxScale = 3.5;
  let isDragging = false;
  let resizeObserver: ResizeObserver | null = null;

  const pointers = new Map<number, { x: number; y: number }>();
  let dragStart = { x: 0, y: 0, translateX: 0, translateY: 0 };
  let pinchStart = { distance: 0, scale: 1, translateX: 0, translateY: 0 };

  async function loadMap() {
    isLoading = true;
    loadError = '';

    try {
      mapResult = retryKey === 0 ? await data.mapPromise : await getPublicMapData({ date: data.date, timeFrom: data.timeFrom });
      selectedTableId = null;
      applyFitTransform();
    } catch {
      loadError = $t('mapLoadFailed');
    } finally {
      isLoading = false;
    }
  }

  $: if (mapResult) {
    const tables = mapResult.map.zones.flatMap((zone) => zone.tables);
    selectedTable = selectedTableId ? tables.find((item) => item.id === selectedTableId) || null : null;
    selectedTableObject = selectedTableId
      ? mapResult.map.objects.find((item) => item.tableId === selectedTableId) || null
      : null;
  }

  function tableFitsGuests(table: MapTable, guests: number) {
    return !guests || (guests >= table.seatsMin && guests <= table.seatsMax);
  }

  function parseStyleJson(styleJson?: string | null) {
    if (!styleJson) return '';

    try {
      const style = typeof styleJson === 'string' ? JSON.parse(styleJson) : styleJson;
      const rules: string[] = [];
      if (typeof style?.background === 'string') rules.push(`background:${style.background}`);
      if (typeof style?.borderColor === 'string') rules.push(`border-color:${style.borderColor}`);
      if (typeof style?.color === 'string') rules.push(`color:${style.color}`);
      if (Number.isFinite(style?.borderRadius)) rules.push(`border-radius:${style.borderRadius}px`);
      if (Number.isFinite(style?.opacity)) rules.push(`opacity:${Math.max(0.2, Math.min(1, style.opacity))}`);
      return rules.join(';');
    } catch {
      return '';
    }
  }

  function applyConstrainedTransform(nextScale: number, nextX: number, nextY: number) {
    if (!mapResult || !viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const constrained = clampTranslate(
      mapResult.map.width,
      mapResult.map.height,
      rect.width,
      rect.height,
      nextScale,
      nextX,
      nextY
    );

    scale = nextScale;
    translateX = constrained.translateX;
    translateY = constrained.translateY;
  }

  function applyFitTransform() {
    if (!mapResult || !viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const usefulBounds = getUsefulContentBounds(mapResult.map);
    const fit = getInitialViewTransform(
      mapResult.map.width,
      mapResult.map.height,
      rect.width,
      rect.height,
      MAP_PADDING,
      usefulBounds
    );

    minScale = clamp(fit.scale * 0.55, 0.25, 2);
    maxScale = Math.max(minScale + 0.35, Math.max(2.4, fit.scale * 3));
    initialTransform = fit;
    applyConstrainedTransform(fit.scale, fit.translateX, fit.translateY);
  }

  function zoomTo(newScale: number, pivotX?: number, pivotY?: number) {
    if (!viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const boundedScale = clamp(newScale, minScale, maxScale);
    const localX = pivotX ?? rect.width / 2;
    const localY = pivotY ?? rect.height / 2;

    const anchored = zoomAroundViewportPoint(localX, localY, boundedScale, scale, translateX, translateY);
    applyConstrainedTransform(boundedScale, anchored.translateX, anchored.translateY);
  }

  function zoomIn() {
    zoomTo(scale * 1.15);
  }

  function zoomOut() {
    zoomTo(scale / 1.15);
  }

  function zoomFit() {
    applyConstrainedTransform(initialTransform.scale, initialTransform.translateX, initialTransform.translateY);
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    if (!viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const pointY = event.clientY - rect.top;
    const intensity = event.deltaY > 0 ? 0.92 : 1.08;
    zoomTo(scale * intensity, pointX, pointY);
  }

  function startDrag(event: PointerEvent) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (!viewportEl) return;

    viewportEl.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      dragStart = { x: event.clientX, y: event.clientY, translateX, translateY };
      isDragging = true;
    }

    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchStart = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
        translateX,
        translateY
      };
    }
  }

  function moveDrag(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1 && isDragging) {
      event.preventDefault();
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      applyConstrainedTransform(scale, dragStart.translateX + dx, dragStart.translateY + dy);
      return;
    }

    if (pointers.size === 2 && viewportEl) {
      event.preventDefault();
      const [a, b] = Array.from(pointers.values());
      const currentDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const midpointClientX = (a.x + b.x) / 2;
      const midpointClientY = (a.y + b.y) / 2;
      const rect = viewportEl.getBoundingClientRect();
      const midpointX = midpointClientX - rect.left;
      const midpointY = midpointClientY - rect.top;
      const nextScale = clamp(pinchStart.scale * (1 + (currentDistance - pinchStart.distance) * PINCH_SENSITIVITY), minScale, maxScale);
      const anchored = zoomAroundViewportPoint(
        midpointX,
        midpointY,
        nextScale,
        pinchStart.scale,
        pinchStart.translateX,
        pinchStart.translateY
      );
      applyConstrainedTransform(nextScale, anchored.translateX, anchored.translateY);
    }
  }

  function endDrag(event: PointerEvent) {
    if (viewportEl?.hasPointerCapture(event.pointerId)) {
      viewportEl.releasePointerCapture(event.pointerId);
    }

    pointers.delete(event.pointerId);
    if (!pointers.size) {
      isDragging = false;
      return;
    }

    if (pointers.size === 1) {
      const [remaining] = Array.from(pointers.values());
      dragStart = { x: remaining.x, y: remaining.y, translateX, translateY };
      isDragging = true;
    }
  }

  function selectTable(tableId: number) {
    selectedTableId = tableId;
    selectedTableObject = mapResult?.map.objects.find((item) => item.tableId === tableId) || null;

    if (!selectedTableObject || !viewportEl) {
      return;
    }

    const center = getObjectCenter(selectedTableObject);
    const rect = viewportEl.getBoundingClientRect();
    const targetX = rect.width / 2 - center.x * scale;
    const targetY = rect.height * (isMobileViewport ? 0.38 : 0.5) - center.y * scale;
    applyConstrainedTransform(scale, targetX, targetY);
  }

  function retryLoad() {
    retryKey += 1;
    loadMap();
  }

  function handleDoubleClick(event: MouseEvent) {
    if (!viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    zoomTo(scale * 1.25, event.clientX - rect.left, event.clientY - rect.top);
  }

  $: zoomPercent = Math.round(scale * 100);

  onMount(() => {
    if (!browser) return;

    const media = window.matchMedia('(max-width: 767px)');
    const syncMedia = () => (isMobileViewport = media.matches);
    syncMedia();
    media.addEventListener('change', syncMedia);

    loadMap();

    resizeObserver = new ResizeObserver(() => {
      if (!mapResult) return;
      if (Math.abs(scale - initialTransform.scale) < 0.02) {
        applyFitTransform();
      } else {
        applyConstrainedTransform(scale, translateX, translateY);
      }
    });

    return () => {
      media.removeEventListener('change', syncMedia);
      resizeObserver?.disconnect();
    };
  });

  $: if (viewportEl && resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver.observe(viewportEl);
  }
</script>

<svelte:head>
  <title>{$t('mapTitle')} · ГорПляж</title>
  <meta name="description" content="Інтерактивна мапа зон GorPliaj з актуальним статусом місць." />
</svelte:head>

<section class="page-block map-page">
  <h1>{$t('mapTitle')}</h1>
  <p class="muted">{$t('mapSubtitle')}</p>

  {#if isLoading}
    <div class="state">Завантаження карти…</div>
  {:else if loadError}
    <div class="state state-error map-error-state">
      <span>{loadError}</span>
      <button type="button" class="btn btn-primary" on:click={retryLoad}>Retry</button>
    </div>
  {:else if mapResult}
    {@const tableById = new Map<number, MapTable>(mapResult.map.zones.flatMap((zone) => zone.tables).map((table) => [table.id, table]))}

    <div class="map-layout">
      <article class="map-zone-board">
        <div class="map-controls">
          <button type="button" class="btn btn-secondary map-control-btn" on:click={zoomIn} aria-label={$t('mapZoomIn')}>+</button>
          <button type="button" class="btn btn-secondary map-control-btn" on:click={zoomOut} aria-label={$t('mapZoomOut')}>−</button>
          <button type="button" class="btn btn-secondary map-control-btn map-control-btn-reset" on:click={zoomFit} aria-label="Fit map">Fit</button>
          <span class="map-zoom-pill">{zoomPercent}%</span>
        </div>

        <div class={`public-map-shell ${isDragging ? 'is-dragging' : ''}`}>
          <div
            class="public-map-viewport"
            bind:this={viewportEl}
            role="application"
            aria-label="Interactive map viewport"
            on:wheel={handleWheel}
            on:pointerdown={startDrag}
            on:pointermove={moveDrag}
            on:pointerup={endDrag}
            on:pointercancel={endDrag}
            on:pointerleave={endDrag}
            on:dblclick={handleDoubleClick}
          >
            <div
              class="public-map-world"
              style={`width:${mapResult.map.width}px;height:${mapResult.map.height}px;transform: translate3d(${translateX}px, ${translateY}px, 0) scale(${scale});`}
            >
              <div
                class="public-map-background"
                style={`background-color:${mapResult.map.backgroundColor || '#d8e7f8'};${mapResult.map.backgroundImage ? `background-image:url(${mapResult.map.backgroundImage});` : ''}`}
              ></div>

              {#each mapResult.map.objects as object}
                {@const table = object.tableId ? tableById.get(object.tableId) : null}
                {#if table}
                  {@const tableDisabled = table.status !== 'free' || !tableFitsGuests(table, data.guests)}
                  <button
                    type="button"
                    class={`public-map-table ${table.status} ${!tableFitsGuests(table, data.guests) ? 'no-fit' : ''} ${selectedTableId === table.id ? 'selected' : ''}`}
                    style={`left:${object.x}px;top:${object.y}px;width:${object.width}px;height:${object.height}px;transform:rotate(${object.rotation}deg);z-index:${object.zIndex};${table.shape === 'ROUND' ? 'border-radius:999px;' : 'border-radius:12px;'}`}
                    on:click={() => selectTable(table.id)}
                    disabled={tableDisabled}
                    aria-label={`${table.name} ${table.seatsMin}-${table.seatsMax}`}
                  >
                    {table.code}
                  </button>
                {:else}
                  <div
                    class={`public-map-object object-${object.type.toLowerCase()}`}
                    style={`left:${object.x}px;top:${object.y}px;width:${object.width}px;height:${object.height}px;transform:rotate(${object.rotation}deg);z-index:${object.zIndex};${parseStyleJson(object.styleJson)}`}
                    title={object.label || object.type}
                  >
                    <span>{object.label || object.type}</span>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
        {#if mapResult.map.objects.length === 0}
          <p class="muted">{$t('mapEmpty')}</p>
        {/if}

        <button type="button" class="map-legend-toggle" on:click={() => (isLegendOpen = !isLegendOpen)}>
          Статуси місць
        </button>
        <div class={`map-legend ${isLegendOpen || !isMobileViewport ? 'is-open' : ''}`}>
          <span><i class="legend-dot free"></i> {$t('mapFree')}</span>
          <span><i class="legend-dot held"></i> {$t('mapHeld')}</span>
          <span><i class="legend-dot busy"></i> {$t('mapBusy')}</span>
          <span><i class="legend-dot no-fit"></i> {$t('mapNoFit')}</span>
        </div>
      </article>

      <aside class={`map-side-panel ${isMobileViewport ? 'mobile-sheet' : ''} ${selectedTable ? 'is-open' : ''}`}>
        <h3>{$t('mapSelectedTitle')}</h3>
        {#if selectedTable}
          <p><strong>{selectedTable.name}</strong></p>
          <p class="muted">Місць: {selectedTable.seatsMin}–{selectedTable.seatsMax}</p>
          <a
            class="btn btn-primary"
            href={`/booking?date=${data.date || ''}&guests=${$page.url.searchParams.get('guests') || ''}&timeFrom=${data.timeFrom}&tableId=${selectedTable.id}&mapId=${mapResult.map.id}&zoneId=${selectedTable.zoneId}`}
          >
            {$t('mapGoToBooking')}
          </a>
        {:else}
          <p class="muted">{$t('mapSelectHint')}</p>
        {/if}

        <p class="muted source-note">{$t('mapSource')}</p>
      </aside>
    </div>
  {/if}
</section>
