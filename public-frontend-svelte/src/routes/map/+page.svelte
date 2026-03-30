<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/stores/i18n';

  export let data;

  let selectedTableId: number | null = null;

  function tableFitsGuests(table, guests: number) {
    return !guests || (guests >= table.seatsMin && guests <= table.seatsMax);
  }
</script>

<svelte:head>
  <title>{$t('mapTitle')} · ГорПляж</title>
  <meta name="description" content="Інтерактивна мапа зон GorPliaj з актуальним статусом місць." />
</svelte:head>

<section class="page-block">
  <h1>{$t('mapTitle')}</h1>
  <p class="muted">Актуальні статуси місць завантажуються з API доступності.</p>

  {#await data.mapPromise}
    <div class="state">Завантаження карти…</div>
  {:then result}
    <div class="map-layout">
      <article class="map-zone-board">
        {#each result.map.zones as zone}
          <section class="map-zone">
            <h3>{zone.name}</h3>
            <div class="tables-grid">
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
        <h3>Выбранное место</h3>
        {#if selectedTableId}
          {@const selected = result.map.zones.flatMap((z) => z.tables).find((item) => item.id === selectedTableId)}
          {#if selected}
            <p><strong>{selected.name}</strong></p>
            <p class="muted">Мест: {selected.seatsMin}–{selected.seatsMax}</p>
            <a
              class="btn btn-primary"
              href={`/booking?date=${data.date || ''}&guests=${$page.url.searchParams.get('guests') || ''}&timeFrom=${data.timeFrom}&tableId=${selected.id}&mapId=${result.map.id}&zoneId=${selected.zoneId}`}
            >
              Перейти к заявке
            </a>
          {/if}
        {:else}
          <p class="muted">Нажмите на место в зоне, чтобы выбрать его.</p>
        {/if}

        <div class="map-legend">
          <span><i class="legend-dot free"></i> Свободно</span>
          <span><i class="legend-dot held"></i> В hold</span>
          <span><i class="legend-dot busy"></i> Занято</span>
          <span><i class="legend-dot no-fit"></i> Не подходит по гостям</span>
        </div>
        <p class="muted source-note">Источник: API</p>
      </aside>
    </div>
  {:catch}
    <div class="state state-error">Не удалось загрузить карту.</div>
  {/await}
</section>
