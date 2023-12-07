<script lang="ts">
  import { activeMode, activeModePrompts } from "@/store";
  import { createEventDispatcher } from "svelte";
  import type { PromptWithMode } from "./App.svelte";
  import Button from "./Button.svelte";
  import PromptForm from "./PromptForm.svelte";
  const dispatch = createEventDispatcher();

  const getPrompts = () => {
    dispatch("getPrompts");
  };

  let promptForEditing:
    | PromptWithMode
    | undefined;

  const setPromptForEditing = (prompt) => {
    promptForEditing = prompt;
  };

  const onPromptDeleted = () => {
    promptForEditing = undefined;
  };

  const onPromptFormClose = () => {
    promptForEditing = undefined;
  };

  const showCreatePrompt = () => {
    promptForEditing = {
      promptId: "",
      title: "",
      description: "",
      category: "",
      message: "",
      modeId: $activeMode?.id,
      mode: $activeMode,
    };
  };
</script>

<div class="flex flex-1 bg-gray-500/5">
  <div class="flex-0 border-r border-panel overflow-y-auto">
    <div class="font-semibold px-4 pt-2 select-none">Prompts</div>
    <div class="flex flex-col">
      {#each $activeModePrompts as prompt}
        <button
          class={`${
            promptForEditing?.promptId === prompt?.promptId ? "active" : ""
          }`}
          on:click={() => setPromptForEditing(prompt)}
        >
          {prompt?.title}
        </button>
      {/each}
    </div>
  </div>
  <div
    class="flex-1 flex flex-col overflow-x-hidden overflow-y-auto justify-center align-middle items-center w-full"
  >
    {#if promptForEditing}
      <PromptForm
        prompt={promptForEditing}
        on:getPrompts={getPrompts}
        on:promptDeleted={onPromptDeleted}
        on:close={onPromptFormClose}
      />
    {/if}
    {#if !promptForEditing}
      <Button variant="secondary" size="lg" on:click={showCreatePrompt}>
        Create new prompt
      </Button>
    {/if}
  </div>
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
