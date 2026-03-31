<script lang="ts">
  import Header from './Header.svelte';
  import Footer from './Footer.svelte';
</script>

<div class="app-shell">
  <Header />
  <main class="page-content">
    <slot />
  </main>
  <Footer />
</div>
