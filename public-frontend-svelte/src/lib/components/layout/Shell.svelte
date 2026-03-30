<script lang="ts">
  import Header from './Header.svelte';
  import BottomNav from './BottomNav.svelte';
  import Footer from './Footer.svelte';
</script>

<div class="app-shell">
  <Header />
  <main class="page-content">
    <slot />
  </main>
  <Footer />
  <BottomNav />
</div>
