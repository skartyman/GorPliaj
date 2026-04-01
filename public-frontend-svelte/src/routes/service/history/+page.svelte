<script lang="ts">
  import { fetchServiceHistory, type ServiceRequest } from '$lib/api/service';
  const clientId = 'client_001';
  let items: ServiceRequest[] = [];
  fetchServiceHistory(clientId).then((x) => (items = x));
</script>

<main class="page">
  <h1>История заявок</h1>
  {#if !items.length}<p>Пока нет заявок.</p>{/if}
  {#each items as item}
    <a href={`/service/requests/${item.id}`} class="card">
      <b>{item.category}</b>
      <span>{item.status}</span>
      <small>{new Date(item.createdAt).toLocaleString()}</small>
    </a>
  {/each}
</main>

<style>
  .page { padding:16px; }
  .card { display:flex; flex-direction:column; background:#fff; border-radius:12px; padding:12px; margin:8px 0; }
</style>
