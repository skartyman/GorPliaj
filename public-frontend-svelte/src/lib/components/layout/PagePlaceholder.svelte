<script lang="ts">
  import { dictionary, locale } from '$lib/stores/i18n';

  export let title = '';
  export let description = '';
</script>

<section class="page-block">
  <h1>{title}</h1>
  <p>{description}</p>
  <p class="muted">{dictionary[$locale].comingSoon}</p>
</section>
