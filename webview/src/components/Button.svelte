<script>
  import { createEventDispatcher } from "svelte";

  export let variant = "primary";
  export let size = "md";
  let className = "";
  export { className as class };
  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch("click");
  }
</script>

<button class={`bg-${variant} size-${size} ${className}`} on:click={handleClick}>
  <slot />
</button>

<style lang="scss">
  .bg-primary {
    @apply bg-blue-500;

    &:hover {
      @apply bg-blue-600;
    }

    &:active {
      @apply bg-blue-700;
    }
  }

  .bg-secondary {
    @apply bg-gray-500/20;

    &:hover {
      @apply bg-gray-600/20;
    }

    &:active {
      @apply bg-gray-700/50;
    }
  }

  .bg-danger {
    @apply bg-red-500/30;

    &:hover {
      @apply bg-red-600/30;
    }

    &:active {
      @apply bg-red-700/50;
    }
  }

  .bg-subtle {
    @apply bg-transparent;

    &:hover {
      @apply bg-gray-500/20;
    }

    &:active {
      @apply bg-gray-500/50;
    }
  }

  .size-lg {
    @apply text-lg py-1.5 px-3;
  }

  .size-md {
    @apply text-sm py-1 px-2;
  }

  .size-sm {
    @apply text-xs py-0.5 px-2;
  }
</style>
