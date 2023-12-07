<script lang="ts">
  import { uniqueModeStore } from "@/store";
  import { createEventDispatcher } from "svelte";
  import type { Mode } from "../../../shared";
  import Button from "./Button.svelte";
  import ModeForm from "./ModeForm.svelte";

  const dispatch = createEventDispatcher();

  const getPrompts = () => {
    dispatch("getPrompts");
  };

  let modeForEditing: Mode | undefined;

  const setModeForEditing = (mode: Mode | undefined) => {
    modeForEditing = mode;
  };

  let _showCreateMode = false;
  const showCreateMode = () => {
    modeForEditing = {
      id: "",
      label: "",
    };
  };
</script>

<div class="flex flex-1 bg-gray-500/5">
  <div class="flex-0 border-r border-panel overflow-y-auto">
    <div class="font-semibold px-4 pt-2 select-none">Modes</div>
    <div class="flex flex-col">
      {#each $uniqueModeStore as mode}
        <button
          class={`${modeForEditing?.id === mode.id ? "active" : ""}`}
          on:click={() => setModeForEditing(mode)}
        >
          {mode.label}
        </button>
      {/each}
    </div>
  </div>
  {#if modeForEditing}
    <div class="flex-1 p-2 flex flex-col overflow-x-hidden overflow-y-auto">
      <ModeForm
        mode={modeForEditing}
        on:close={() => setModeForEditing(undefined)}
        on:getPrompts
      />
    </div>
  {/if}
  {#if !modeForEditing}
    <div
      class="flex-1 flex flex-col overflow-x-hidden overflow-y-auto justify-center align-middle items-center w-full"
    >
      <Button variant="secondary" size="lg" on:click={showCreateMode}>
        Create new mode
      </Button>
    </div>
  {/if}
</div>

<style lang="scss">
  button {
    @apply px-4 py-0 cursor-pointer opacity-50 text-left;

    &:hover {
      background: var(--vscode-list-hoverBackground);
      opacity: 1;
      text-decoration: underline;
    }

    &:active {
      opacity: 0.8;
    }
  }

  .active {
    @apply opacity-100;
    background: var(--vscode-list-hoverBackground);
  }
</style>
