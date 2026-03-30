<script lang="ts">
  import EventCard from '$lib/features/events/EventCard.svelte';
  export let data;
</script>

<section class="page-block">
  <h1>Афіша подій</h1>
  <p class="muted">Усі опубліковані події GorPliaj: бронювання, квитки, деталі програми.</p>

  {#await data.eventsPromise}
    <div class="state">Завантаження подій…</div>
  {:then result}
    {#if !result.events.length}
      <div class="state">Поки немає опублікованих подій.</div>
    {:else}
      <div class="events-grid">
        {#each result.events as event}
          <EventCard {event} />
        {/each}
      </div>
      <p class="muted source-note">Джерело: {result.source === 'api' ? 'реальний API' : 'тимчасові mock-дані (адаптер)'}</p>
    {/if}
  {:catch}
    <div class="state state-error">Не вдалося завантажити події. Спробуйте ще раз пізніше.</div>
  {/await}
</section>
