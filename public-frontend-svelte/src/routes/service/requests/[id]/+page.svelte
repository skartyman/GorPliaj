<script lang="ts">
  import { page } from '$app/stores';
  import { fetchServiceRequest, type ServiceRequest } from '$lib/api/service';
  let item: ServiceRequest | null = null;
  $: id = $page.params.id;
  $: fetchServiceRequest(id).then((x) => (item = x));
</script>

<main class="page">
  <h1>Статус заявки</h1>
  {#if item}
    <div class="card">
      <p><b>ID:</b> {item.id}</p>
      <p><b>Статус:</b> {item.status}</p>
      <p><b>Категория:</b> {item.category}</p>
      <p><b>Описание:</b> {item.description}</p>
      <p><b>Вложения:</b> {item.attachments.length}</p>
    </div>
  {/if}
</main>

<style>
  .page { padding:16px; }
  .card { background:#fff; border-radius:12px; padding:12px; }
</style>
