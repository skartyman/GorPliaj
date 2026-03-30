<script lang="ts">
  import { page } from '$app/stores';
  export let data;

  let selectedTableId: number | null = null;
</script>

<section class="page-block">
  <h1>Карта закладу</h1>
  <p class="muted">Проміжна public-версія: візуалізація зон і місць з підготовкою під інтерактивний вибір.</p>

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
                  class={`table-dot ${table.status} ${selectedTableId === table.id ? 'selected' : ''}`}
                  style={`left:${table.x}%;top:${table.y}%;`}
                  on:click={() => (selectedTableId = table.id)}
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
              href={`/booking?date=${$page.url.searchParams.get('date') || ''}&guests=${$page.url.searchParams.get('guests') || ''}&tableId=${selected.id}`}
            >
              Перейти к заявке
            </a>
          {/if}
        {:else}
          <p class="muted">Нажмите на место в зоне, чтобы выбрать его.</p>
        {/if}

        <p class="muted source-note">Источник: {result.source === 'api' ? 'API' : 'mock-адаптер'}</p>
      </aside>
    </div>
  {:catch}
    <div class="state state-error">Не удалось загрузить карту.</div>
  {/await}
</section>
