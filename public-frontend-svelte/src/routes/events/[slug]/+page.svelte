<script lang="ts">
  import { formatEventDateRange } from '$lib/features/events/utils';
  import ButtonLink from '$lib/components/ui/ButtonLink.svelte';
  export let data;
</script>

<section class="page-block">
  <a href="/events" class="text-link">← Усі події</a>
  <article class="event-detail">
    <img src={data.event.posterImage || '/icons/lebedi.jpg'} alt={data.event.title} class="event-detail-image" />

    <div>
      <h1>{data.event.title}</h1>
      <p class="event-date">{formatEventDateRange(data.event.startAt, data.event.endAt)}</p>
      <p class="muted">{data.event.shortDescription}</p>
      <p>{data.event.fullDescription}</p>

      <div class="event-actions">
        <ButtonLink href={`/booking?event=${data.event.slug}`}>Забронировать столик</ButtonLink>
        <ButtonLink href="/map" variant="secondary">Перейти к карте</ButtonLink>
        {#if (data.event.ctaType === 'TICKETS' || data.event.ctaType === 'BOTH') && data.event.ticketUrl}
          <ButtonLink href={data.event.ticketUrl} target="_blank" variant="secondary">Купить билет</ButtonLink>
        {/if}
      </div>
      <p class="muted source-note">Джерело: {data.source === 'api' ? 'реальний API' : 'тимчасові mock-дані'}</p>
    </div>
  </article>
</section>
