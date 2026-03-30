<script lang="ts">
  import ButtonLink from '$lib/components/ui/ButtonLink.svelte';
</script>

<section class="home-hero">
  <img class="hero-bg" src="/icons/lebedi.jpg" alt="Панорама ГорПляж" fetchpriority="high" decoding="async" />
  <div class="hero-overlay">
    <p class="eyebrow">Пляж · Ресторан · Події</p>
    <h1>ГорПляж в Одесі</h1>
    <p class="muted">Пляж Отрада, море та відпочинок зі смаком — в одному сучасному просторі.</p>
    <div class="hero-cta">
      <ButtonLink href="/booking">Забронювати онлайн</ButtonLink>
      <ButtonLink href="/events" variant="secondary">Афіша подій</ButtonLink>
    </div>
  </div>
</section>
