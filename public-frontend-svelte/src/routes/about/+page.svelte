<script lang="ts">
  import { t } from '$lib/stores/i18n';
</script>

<svelte:head>
  <title>{$t('aboutMetaTitle')}</title>
  <meta name="description" content={$t('aboutMetaDescription')} />
</svelte:head>

<section class="page-block">
  <h1>ГорПляж</h1>
  <p class="muted">Пляжно-ресторанний простір на пляжі Отрада в Одесі: денний відпочинок, кухня, бар та вечірні події.</p>

  <div class="split">
    <article>
      <h2>Що доступно онлайн</h2>
      <ul>
        <li>Актуальна афіша подій.</li>
        <li>Карта зон та столів із live-статусами.</li>
        <li>Онлайн-заявка на бронювання.</li>
        <li>Публічне меню з API-даними.</li>
      </ul>
    </article>
    <article>
      <h2>Контакти</h2>
      <p><strong>Локація:</strong> Одеса, пляж Отрада</p>
      <p><strong>Графік:</strong> щодня, сезонно</p>
      <p><strong>Бронювання:</strong> через сторінку <a href="/booking" class="text-link">/booking</a></p>
      <p><strong>Карта столів:</strong> <a href="/map" class="text-link">/map</a></p>
    </article>
  </div>
</section>
