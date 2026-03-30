<script lang="ts">
  import { page } from '$app/stores';

  const today = new Date().toISOString().slice(0, 10);
  let form = {
    date: today,
    guests: 2,
    visitMode: 'DAY',
    placeType: 'TABLE'
  };
</script>

<section class="page-block">
  <h1>Бронювання</h1>
  <p class="muted">Перший робочий екран бронювання. Далі — вибір столу на мапі та відправка заявки.</p>

  {#if $page.url.searchParams.get('event')}
    <p class="booking-event-context">Бронювання для події: {$page.url.searchParams.get('event')}</p>
  {/if}

  <form class="booking-form-lite" action="/map" method="GET">
    <label>
      Дата
      <input type="date" name="date" bind:value={form.date} min={today} required />
    </label>

    <label>
      Гостей
      <input type="number" name="guests" bind:value={form.guests} min="1" max="20" required />
    </label>

    <label>
      Режим відвідування
      <select name="visitMode" bind:value={form.visitMode}>
        <option value="DAY">День (пляж + ресторан)</option>
        <option value="EVENING">Вечір (події + ресторан)</option>
        <option value="WINTER">Зимовий зал</option>
      </select>
    </label>

    <label>
      Тип місця
      <select name="placeType" bind:value={form.placeType}>
        <option value="TABLE">Стіл</option>
        <option value="SUNBED">Лежак</option>
        <option value="BUNGALOW">Бунгало</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary">Перейти до вибору місця на мапі</button>
  </form>
</section>
