<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "./Button.svelte";

  export let open: boolean = false;

  const dispatch = createEventDispatcher();

  function close() {
    open = false;
    dispatch("close");
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div 
    role="dialog"
    class="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-neutral-500/50 flex items-center justify-center z-50"
    on:click={close}
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="bg-neutral-800 text-white p-4 rounded-md shadow-xl max-w-[75%]" on:click|stopPropagation>
      <slot />
      <div class="flex justify-end mt-4">
        <Button variant="secondary" on:click={close}>Close</Button>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  :global {
    code {
      @apply text-white;
    }
  }
</style>