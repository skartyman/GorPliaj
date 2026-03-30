<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { bookingsApi } from '$lib/api/bookings';
  import { getPublicMapData } from '$lib/features/map/publicMapAdapter';
  import type { MapTable } from '$lib/features/map/types';
  import { t } from '$lib/stores/i18n';

  const today = new Date().toISOString().slice(0, 10);
  let loading = true;
  let errorMessage = '';
  let successMessage = '';

  let form = {
    date: $page.url.searchParams.get('date') || today,
    guests: Number($page.url.searchParams.get('guests') || '2'),
    timeFrom: $page.url.searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    commentCustomer: ''
  };

  const selected = {
    mapId: Number($page.url.searchParams.get('mapId') || '0'),
    zoneId: Number($page.url.searchParams.get('zoneId') || '0'),
    tableId: Number($page.url.searchParams.get('tableId') || '0')
  };

  let mapName = '';
  let tableOptions: MapTable[] = [];
  let selectedTable: MapTable | null = null;

  async function loadMap() {
    if (!browser) return;

    loading = true;
    errorMessage = '';

    try {
      const result = await getPublicMapData({ date: form.date, timeFrom: form.timeFrom });
      mapName = result.map.name;
      tableOptions = result.map.zones.flatMap((zone) =>
        zone.tables
          .filter((table) => table.status === 'free' && form.guests >= table.seatsMin && form.guests <= table.seatsMax)
          .map((table) => ({ ...table, zoneId: zone.id }))
      );

      if (selected.tableId) {
        selectedTable = tableOptions.find((table) => table.id === selected.tableId) || null;
      }

      if (!selectedTable && tableOptions.length) {
        selectedTable = tableOptions[0];
      }

      if (selectedTable) {
        selected.tableId = selectedTable.id;
        selected.zoneId = selectedTable.zoneId || selected.zoneId;
      }

      if (!selected.mapId) {
        selected.mapId = result.map.id;
      }
    } catch {
      errorMessage = 'Не вдалося завантажити доступні місця.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadMap();
  });

  async function submitBooking() {
    if (!selected.tableId || !selected.mapId || !selected.zoneId) {
      errorMessage = 'Оберіть місце на мапі перед відправкою.';
      return;
    }

    loading = true;
    errorMessage = '';
    successMessage = '';

    try {
      await bookingsApi.create({
        tableId: selected.tableId,
        mapId: selected.mapId,
        zoneId: selected.zoneId,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        timeTo: '23:00',
        commentCustomer: form.commentCustomer
      });

      successMessage = 'Заявку на бронювання створено. Менеджер зв’яжеться з вами.';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Не вдалося створити бронювання.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('bookingTitle')} · ГорПляж</title>
  <meta name="description" content="Форма онлайн-бронювання GorPliaj з реальним API резервувань." />
</svelte:head>

<section class="page-block">
  <h1>{$t('bookingTitle')}</h1>
  <p class="muted">Фінальний крок: виберіть вільний стіл і відправте заявку у backend.</p>

  {#if $page.url.searchParams.get('event')}
    <p class="booking-event-context">Бронювання для події: {$page.url.searchParams.get('event')}</p>
  {/if}

  <form class="booking-form-lite" on:submit|preventDefault={submitBooking}>
    <label>
      Дата
      <input type="date" name="date" bind:value={form.date} min={today} required on:change={loadMap} />
    </label>

    <label>
      Гостей
      <input type="number" name="guests" bind:value={form.guests} min="1" max="20" required on:change={loadMap} />
    </label>

    <label>
      Час початку
      <input type="time" name="timeFrom" bind:value={form.timeFrom} required on:change={loadMap} />
    </label>

    <label>
      Доступні місця ({mapName || 'карта'})
      <select
        bind:value={selected.tableId}
        on:change={() => {
          selectedTable = tableOptions.find((table) => table.id === Number(selected.tableId)) || null;
          selected.zoneId = selectedTable?.zoneId || selected.zoneId;
        }}
      >
        {#if !tableOptions.length}
          <option value="">Немає вільних місць під ці параметри</option>
        {:else}
          {#each tableOptions as table}
            <option value={table.id}>{table.name} ({table.seatsMin}-{table.seatsMax})</option>
          {/each}
        {/if}
      </select>
    </label>

    <label>
      Ім’я
      <input type="text" bind:value={form.customerName} required minlength="2" />
    </label>

    <label>
      Телефон
      <input type="tel" bind:value={form.customerPhone} required minlength="7" />
    </label>

    <label>
      Коментар
      <textarea rows="3" bind:value={form.commentCustomer}></textarea>
    </label>

    <div class="hero-cta">
      <button type="submit" class="btn btn-primary" disabled={loading || !tableOptions.length}>Відправити заявку</button>
      <a class="btn btn-secondary" href={`/map?date=${form.date}&guests=${form.guests}&timeFrom=${form.timeFrom}`}>Відкрити карту</a>
    </div>

    {#if loading}
      <div class="state">Оновлення даних…</div>
    {/if}
    {#if errorMessage}
      <div class="state state-error">{errorMessage}</div>
    {/if}
    {#if successMessage}
      <div class="state booking-success">{successMessage}</div>
    {/if}
  </form>
</section>
