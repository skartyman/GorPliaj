<script lang="ts">
  export let data;
</script>

<section class="page-block">
  <a href="/events" class="text-link">← Усі події</a>
  <h1>{data.event.title}</h1>
  <p>{data.event.shortDescription}</p>
  <article class="muted">{data.event.fullDescription || 'Деталі будуть додані під час наступного етапу міграції.'}</article>
</section>
