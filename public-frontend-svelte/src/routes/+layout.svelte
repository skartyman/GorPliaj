<script lang="ts">
  import Shell from '$lib/components/layout/Shell.svelte';
  import '../styles.css';
</script>

<svelte:head>
  <title>ГорПляж</title>
  <meta name="description" content="ГорПляж — новий публічний фронт на SvelteKit" />
</svelte:head>

<Shell>
  <slot />
</Shell>
