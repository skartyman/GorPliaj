<script lang="ts">
  export let data;
</script>

<section class="page-block">
  <h1>Події</h1>
  <div class="card-grid">
    {#if data.events?.length}
      {#each data.events as event}
        <a href={`/events/${event.slug}`} class="card">
          <h2>{event.title}</h2>
          <p>{event.shortDescription}</p>
        </a>
      {/each}
    {:else}
      <p class="muted">Поки немає опублікованих подій.</p>
    {/if}
  </div>
</section>
