<script lang="ts">
  export let error;
</script>

<section class="page-block">
  <h1>Щось пішло не так</h1>
  <p class="muted">{error?.message || 'Невідома помилка'}</p>
</section>
