<script lang="ts">
  import HomeHero from '$lib/components/home/HomeHero.svelte';
  import EventCard from '$lib/features/events/EventCard.svelte';
  import ButtonLink from '$lib/components/ui/ButtonLink.svelte';
  export let data;
</script>

<HomeHero />

<section class="page-block split">
  <article>
    <h2>Про заклад</h2>
    <p class="muted">
      ГорПляж — атмосферний пляжно-ресторанний простір на пляжі Отрада: сніданки біля моря,
      вечірні події, мапа столів та онлайн-бронювання.
    </p>
  </article>
  <article class="facts">
    <div><span>Формат</span><strong>Beach · Restaurant · Events</strong></div>
    <div><span>Меню</span><strong>{data.menuCount}+ позицій</strong></div>
    <div><span>Джерело меню</span><strong>{data.menuSource === 'api' ? 'API' : 'mock'}</strong></div>
  </article>
</section>

<section class="page-block">
  <div class="section-head">
    <h2>Найближчі події</h2>
    <a class="text-link" href="/events">Усі події</a>
  </div>
  <div class="events-grid">
    {#if data.events?.length}
      {#each data.events as event}
        <EventCard {event} />
      {/each}
    {:else}
      <p class="muted">Скоро додамо нові події.</p>
    {/if}
  </div>
  <p class="muted source-note">Джерело: {data.eventsSource === 'api' ? 'реальний API' : 'тимчасові mock-дані'}</p>
</section>

<section class="page-block split">
  <article>
    <h2>Бронювання</h2>
    <p class="muted">Оберіть дату, кількість гостей та формат відпочинку — далі перейдіть до мапи і вибору столу.</p>
    <ButtonLink href="/booking">Почати бронювання</ButtonLink>
  </article>
  <article>
    <h2>Меню та атмосфера</h2>
    <p class="muted">Перший етап: короткий preview. Детальна сторінка меню буде підключена в наступних спринтах.</p>
    <ButtonLink href="/map" variant="secondary">Подивитися карту зон</ButtonLink>
  </article>
</section>
