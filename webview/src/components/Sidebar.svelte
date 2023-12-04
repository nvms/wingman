<script lang="ts">
</script>

<div class="flex-0 sidebar overflow-auto h-full">
  <slot />
</div>

<style lang="scss">
  .sidebar {
    @apply border-r;
    border-color: var(--vscode-panel-border);
  }
</style>