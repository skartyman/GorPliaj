<script lang="ts">
  export let href = '#';
  export let variant: 'primary' | 'secondary' = 'primary';
  export let target = '';
</script>

<a class={`btn btn-${variant}`} href={href} target={target || undefined} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
  <slot />
</a>
