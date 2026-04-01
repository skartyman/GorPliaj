<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    createServiceRequest,
    fetchClientEquipment,
    fetchClientProfile,
    uploadMedia,
    type Equipment,
    type MediaAttachment
  } from '$lib/api/service';

  const telegramUserId = '10001';
  const categories = [
    'Не включается',
    'Нет воды / нет пролива',
    'Не греет',
    'Ошибка на дисплее',
    'Течь',
    'Плохой пролив / качество кофе',
    'Другое'
  ];

  let step = 1;
  let loading = true;
  let clientId = '';
  let equipment: Equipment[] = [];
  let selectedEquipmentId = '';
  let category = categories[0];
  let description = '';
  let urgency = 'Высокая';
  let canOperateNow = false;
  let attachments: MediaAttachment[] = [];
  let creating = false;
  let createdId = '';

  async function init() {
    const profile = await fetchClientProfile(telegramUserId);
    clientId = profile.id;
    equipment = await fetchClientEquipment(profile.id);
    selectedEquipmentId = equipment[0]?.id || '';
    loading = false;
  }

  init();

  async function onUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    for (const file of files) {
      const media = await uploadMedia(file);
      attachments = [...attachments, media];
    }
  }

  async function submit() {
    creating = true;
    const created = await createServiceRequest({
      clientId,
      equipmentId: selectedEquipmentId,
      category,
      description,
      urgency,
      canOperateNow,
      attachments
    });
    createdId = created.id;
    step = 7;
    creating = false;
  }
</script>

{#if loading}
  <p>Загрузка кабинета...</p>
{:else}
  <main class="service">
    <h1>Сервисная заявка</h1>
    {#if step === 1}
      <h2>1. Оборудование</h2>
      {#each equipment as item}
        <button class:selected={item.id === selectedEquipmentId} on:click={() => (selectedEquipmentId = item.id)}>{item.name}<br />#{item.internalNumber}</button>
      {/each}
      <button on:click={() => (step = 2)}>Далее</button>
    {:else if step === 2}
      <h2>2. Категория</h2>
      <select bind:value={category}>{#each categories as c}<option value={c}>{c}</option>{/each}</select>
      <button on:click={() => (step = 3)}>Далее</button>
    {:else if step === 3}
      <h2>3. Описание</h2>
      <textarea bind:value={description} rows="5"></textarea>
      <button on:click={() => (step = 4)}>Далее</button>
    {:else if step === 4}
      <h2>4. Срочность</h2>
      <select bind:value={urgency}>
        <option>Критично</option><option>Высокая</option><option>Планово</option>
      </select>
      <label><input type="checkbox" bind:checked={canOperateNow} /> Оборудование пока может работать</label>
      <button on:click={() => (step = 5)}>Далее</button>
    {:else if step === 5}
      <h2>5. Фото/видео</h2>
      <input type="file" multiple accept="image/*,video/*" on:change={onUpload} />
      <p>Загружено: {attachments.length}</p>
      <button on:click={() => (step = 6)}>Далее</button>
    {:else if step === 6}
      <h2>6. Подтверждение</h2>
      <p>{category}</p>
      <p>{description}</p>
      <button disabled={creating} on:click={submit}>Создать заявку</button>
    {:else}
      <h2>✅ Заявка отправлена</h2>
      <p>Номер: {createdId}</p>
      <button on:click={() => goto(`/service/requests/${createdId}`)}>Статус заявки</button>
      <button on:click={() => goto('/service/history')}>История заявок</button>
    {/if}
  </main>
{/if}

<style>
  .service { padding: 16px; display:flex; flex-direction:column; gap:12px; }
  button, select, textarea, input { font-size: 16px; padding: 12px; border-radius: 12px; }
  button.selected { border:2px solid #0ea5e9; }
</style>
