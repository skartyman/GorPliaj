<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/stores/i18n';

  export let data;

  let selectedTableId: number | null = null;
  const minZoom = 1;
  const maxZoom = 2.5;
  const zoomStep = 0.25;
  let zoom = 1;

  function tableFitsGuests(table, guests: number) {
    return !guests || (guests >= table.seatsMin && guests <= table.seatsMax);
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
    <div class="map-layout">
      <article class="map-zone-board">
        <div class="map-controls">
          <button type="button" class="btn btn-secondary map-control-btn" on:click={zoomIn} aria-label={$t('mapZoomIn')}>+</button>
          <button type="button" class="btn btn-secondary map-control-btn" on:click={zoomOut} aria-label={$t('mapZoomOut')}>−</button>
          <button type="button" class="btn btn-secondary map-control-btn map-control-btn-reset" on:click={zoomReset} aria-label={$t('mapZoomReset')}>
            {$t('mapZoomReset')}
          </button>
        </div>
        {#each result.map.zones as zone}
          <section class="map-zone">
            <h3>{zone.name}</h3>
            <div class="tables-grid" style={`transform: scale(${zoom});`}>
              {#each zone.tables as table}
                <button
                  type="button"
                  class={`table-dot ${table.status} ${!tableFitsGuests(table, data.guests) ? 'no-fit' : ''} ${selectedTableId === table.id ? 'selected' : ''}`}
                  style={`left:${table.x}%;top:${table.y}%;`}
                  on:click={() => (selectedTableId = table.id)}
                  disabled={table.status !== 'free' || !tableFitsGuests(table, data.guests)}
                  aria-label={`${table.name} ${table.seatsMin}-${table.seatsMax}`}
                >
                  {table.code}
                </button>
              {/each}
            </div>
          </section>
        {/each}
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
