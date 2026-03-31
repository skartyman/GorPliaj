<script lang="ts">
  import { formatEventDateRange } from '$lib/features/events/utils';

  export let data: {
    events: Array<{
      id: number;
      slug: string;
      title: string;
      shortDescription: string;
      posterImage: string;
      startAt: string;
      endAt: string | null;
    }>;
    menuPreviewImages: string[];
    news: Array<{ id: number; title: string; summary?: string; publishedAt?: string }>;
  };

  const fallbackMenuPhotos = ['/icons/piano.jpg', '/icons/moonpirs.jpg', '/icons/zakat.jpg', '/icons/lebedi.jpg'];

  $: menuPhotos = data.menuPreviewImages?.length ? data.menuPreviewImages : fallbackMenuPhotos;
  $: newsCards = data.news?.length
    ? data.news
    : [
        { id: 1, title: 'Новые вечерние сеты', summary: 'Обновили музыкальную программу на ближайшие выходные.' },
        { id: 2, title: 'Сезонное меню', summary: 'Добавили лёгкие блюда и авторские коктейли.' },
        { id: 3, title: 'Летние резервы', summary: 'Открыли предварительную бронь на вечерние даты.' }
      ];
</script>

<svelte:head>
  <title>ГорПляж — ресторан у моря</title>
  <meta name="description" content="Премиальный ресторанный опыт: афиша, бронь, меню и новости в одном мобильном потоке." />
</svelte:head>

<div class="home-flow">
  <section class="home-section" id="afisha">
    <div class="section-head">
      <h2>Афиша</h2>
      <a href="/events" class="text-link">Все события</a>
    </div>
    <div class="h-scroll cards-scroll">
      {#if data.events?.length}
        {#each data.events as event, index}
          <article class={`premium-card event-premium-card ${index === 0 ? 'event-premium-card-featured' : ''}`}>
            <a href={`/events/${event.slug}`} class="media-link">
              <img src={event.posterImage || '/icons/lebedi.jpg'} alt={event.title} loading="lazy" decoding="async" />
              {#if index === 0}
                <div class="event-premium-overlay-copy">
                  <p class="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
                  <h3>{event.title}</h3>
                </div>
              {/if}
            </a>
            {#if index !== 0}
              <div class="event-copy">
                <p class="event-date">{formatEventDateRange(event.startAt, event.endAt)}</p>
                <h3>{event.title}</h3>
                <a class="btn btn-primary" href={`/events/${event.slug}`}>Смотреть</a>
              </div>
            {/if}
          </article>
        {/each}
      {:else}
        <article class="premium-card event-premium-card">
          <img src="/icons/lebedi.jpg" alt="События скоро" loading="lazy" decoding="async" />
          <div class="event-copy">
            <p class="event-date">Скоро</p>
            <h3>Новые события скоро появятся</h3>
            <a class="btn btn-primary" href="/events">К афише</a>
          </div>
        </article>
      {/if}
    </div>
  </section>

  <section class="home-section" id="booking">
    <div class="premium-card booking-card">
      <h2>Бронирование</h2>
      <p class="muted">Выберите дату и стол на интерактивной карте.</p>
      <a href="/map" class="btn btn-primary booking-main-btn">Забронировать</a>
    </div>
  </section>

  <section class="home-section" id="menu">
    <div class="section-head">
      <h2>Меню</h2>
      <a href="/menu" class="text-link">Открыть меню</a>
    </div>
    <div class="h-scroll menu-gallery">
      {#each menuPhotos as photo}
        <article class="premium-card menu-image-card">
          <img src={photo} alt="Блюдо" loading="lazy" decoding="async" />
        </article>
      {/each}
    </div>
    <a href="/menu" class="btn btn-secondary menu-open-btn">Открыть меню</a>
  </section>

  <section class="home-section" id="news">
    <div class="section-head">
      <h2>Новости</h2>
    </div>
    <div class="news-stack">
      {#each newsCards as item}
        <article class="premium-card news-card">
          <h3>{item.title}</h3>
          <p class="muted">{item.summary}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="home-section" id="about">
    <article class="premium-card about-card" id="contacts">
      <h2>Про нас</h2>
      <p class="muted">
        ГорПляж — современный ресторан у моря с живой музыкой, авторской кухней и комфортной посадкой у воды.
      </p>
      <div class="about-grid">
        <p><strong>Телефон:</strong> <a href="tel:+380000000000">+38 (000) 000-00-00</a></p>
        <p><strong>Email:</strong> <a href="mailto:hello@gorpliaj.com">hello@gorpliaj.com</a></p>
        <p><strong>Адрес:</strong> пляж Отрада, Одесса</p>
        <p><strong>Расписание:</strong> ежедневно 10:00 – 23:00</p>
      </div>
      <div class="map-embed-wrap">
        <iframe
          title="Карта ГорПляж"
          src="https://maps.google.com/maps?q=Otrada%20Beach%20Odesa&t=&z=13&ie=UTF8&iwloc=&output=embed"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </article>
  </section>
</div>
