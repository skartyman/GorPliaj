<script lang="ts">
  import ButtonLink from '$lib/components/ui/ButtonLink.svelte';
  import type { EventItem } from './types';
  import { formatEventDateRange } from './utils';

  export let event: EventItem;
  export let featured = false;
</script>

<article class={`event-card ${featured ? 'event-card-featured' : ''}`}>
  <a href={`/events/${event.slug}`} class="event-card-image-link">
    <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} loading="lazy" decoding="async" />
    {#if featured}
      <div class="event-card-overlay-copy">
        <p class="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
        <h3>{event.title}</h3>
      </div>
    {/if}
  </a>
  {#if !featured}
    <div class="event-card-content">
      <p class="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
      <h3><a href={`/events/${event.slug}`}>{event.title}</a></h3>
      <p class="muted">{event.shortDescription}</p>
      <div class="event-actions">
        {#if event.ctaType === 'BOOKING' || event.ctaType === 'BOTH'}
          <ButtonLink href={`/booking?event=${event.slug}`} variant="primary">Забронювати</ButtonLink>
        {/if}
        {#if (event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl}
          <ButtonLink href={event.ticketUrl} variant="secondary" target="_blank">Квитки</ButtonLink>
        {/if}
      </div>
    </div>
  {/if}
</article>
