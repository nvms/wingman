<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value: string[] = [];
  export let name = "";
  let inputValue = "";
  const dispatch = createEventDispatcher();

  function handleInput(event: KeyboardEvent) {
    if (event.key === "Enter" && inputValue.trim()) {
      event.preventDefault();
      value = [...value, inputValue.trim()];
      dispatch("change", value);
      inputValue = "";
    }
  }

  function removeTag(tag: string) {
    value = value.filter((v) => v !== tag);
    dispatch("change", value);
  }
</script>

<div class="tags-input">
  {#if value.length > 0}
    <div class="tags-grid">
      {#each value as tag}
        <span class="tag">
          {tag} <button class="remove" on:click={() => removeTag(tag)}>x</button>
        </span>
      {/each}
    </div>
  {/if}
  <input
    {name}
    type="text"
    bind:value={inputValue}
    on:keydown={handleInput}
    placeholder="Add item"
  />
</div>

<style lang="scss">
  .tags-input {
    @apply flex flex-col transition-all;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-input-foreground);

    &:focus-within {
      outline: none;
      border-color: var(--vscode-inputOption-activeBorder);
    }

    .tags-grid {
      @apply grid gap-0.5 p-0.5;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }

    input[type="text"] {
      @apply flex-1 border-none bg-transparent outline-none p-1;
      color: var(--vscode-input-foreground);
      &:focus {
        outline: none;
        // border-color: var(--vscode-inputOption-activeBorder);
      }
    }

    .tag {
      @apply bg-neutral-500/70 text-white px-1 flex items-center justify-between;
      .remove {
        @apply ml-2 cursor-pointer;
      }
    }
  }
</style>
