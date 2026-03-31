<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/stores/i18n';

  export let data;

  let selectedTableId: number | null = null;
  const minZoom = 0.75;
  const maxZoom = 2.5;
  const zoomStep = 0.25;
  let zoom = 1;

  function tableFitsGuests(table, guests: number) {
    return !guests || (guests >= table.seatsMin && guests <= table.seatsMax);
  }

  function parseStyleJson(styleJson?: string | null) {
    if (!styleJson) {
      return '';
    }

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

  function zoomIn() {
    zoom = Math.min(maxZoom, Number((zoom + zoomStep).toFixed(2)));
  }

  function zoomOut() {
    zoom = Math.max(minZoom, Number((zoom - zoomStep).toFixed(2)));
  }

  function zoomReset() {
    zoom = 1;
  }
</script>

<svelte:head>
  <title>{$t('mapTitle')} · ГорПляж</title>
  <meta name="description" content="Інтерактивна мапа зон GorPliaj з актуальним статусом місць." />
</svelte:head>

<section class="page-block">
  <h1>{$t('mapTitle')}</h1>
  <p class="muted">{$t('mapSubtitle')}</p>

  {#await data.mapPromise}
    <div class="state">Завантаження карти…</div>
  {:then result}
    {@const tableById = new Map(result.map.zones.flatMap((zone) => zone.tables).map((table) => [table.id, table]))}
    <div class="map-layout">
      <article class="map-zone-board">
        <div class="map-controls">
          <button type="button" class="btn btn-secondary map-control-btn" on:click={zoomIn} aria-label={$t('mapZoomIn')}>+</button>
          <button type="button" class="btn btn-secondary map-control-btn" on:click={zoomOut} aria-label={$t('mapZoomOut')}>−</button>
          <button type="button" class="btn btn-secondary map-control-btn map-control-btn-reset" on:click={zoomReset} aria-label={$t('mapZoomReset')}>
            {$t('mapZoomReset')}
          </button>
        </div>

        <div class="public-map-shell">
          <div class="public-map-viewport">
            <div
              class="public-map-world"
              style={`width:${result.map.width}px;height:${result.map.height}px;transform:scale(${zoom});`}
            >
              <div
                class="public-map-background"
                style={`background-color:${result.map.backgroundColor || '#d8e7f8'};${result.map.backgroundImage ? `background-image:url(${result.map.backgroundImage});` : ''}`}
              ></div>

              {#each result.map.objects as object}
                {@const table = object.tableId ? tableById.get(object.tableId) : null}
                {#if table}
                  {@const tableDisabled = table.status !== 'free' || !tableFitsGuests(table, data.guests)}
                  <button
                    type="button"
                    class={`public-map-table ${table.status} ${!tableFitsGuests(table, data.guests) ? 'no-fit' : ''} ${selectedTableId === table.id ? 'selected' : ''}`}
                    style={`left:${object.x}px;top:${object.y}px;width:${object.width}px;height:${object.height}px;transform:rotate(${object.rotation}deg);z-index:${object.zIndex};${table.shape === 'ROUND' ? 'border-radius:999px;' : 'border-radius:12px;'}`}
                    on:click={() => (selectedTableId = table.id)}
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
      </article>

      <aside class="map-side-panel">
        <h3>{$t('mapSelectedTitle')}</h3>
        {#if selectedTableId}
          {@const selected = result.map.zones.flatMap((z) => z.tables).find((item) => item.id === selectedTableId)}
          {#if selected}
            <p><strong>{selected.name}</strong></p>
            <p class="muted">Місць: {selected.seatsMin}–{selected.seatsMax}</p>
            <a
              class="btn btn-primary"
              href={`/booking?date=${data.date || ''}&guests=${$page.url.searchParams.get('guests') || ''}&timeFrom=${data.timeFrom}&tableId=${selected.id}&mapId=${result.map.id}&zoneId=${selected.zoneId}`}
            >
              {$t('mapGoToBooking')}
            </a>
          {/if}
        {:else}
          <p class="muted">{$t('mapSelectHint')}</p>
        {/if}

        <div class="map-legend">
          <span><i class="legend-dot free"></i> {$t('mapFree')}</span>
          <span><i class="legend-dot held"></i> {$t('mapHeld')}</span>
          <span><i class="legend-dot busy"></i> {$t('mapBusy')}</span>
          <span><i class="legend-dot no-fit"></i> {$t('mapNoFit')}</span>
        </div>
        <p class="muted source-note">{$t('mapSource')}</p>
      </aside>
    </div>
  {:catch}
    <div class="state state-error">{$t('mapLoadFailed')}</div>
  {/await}
</section>
