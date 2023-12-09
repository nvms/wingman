<script lang="ts">
  import extComm from "@/messaging";
  import { activeModePrompts, uniqueModeStore } from "@/store";
  import { createEventDispatcher, onMount } from "svelte";
  import type { Mode, PromptDefinition } from "../../../shared";
  import Button from "./Button.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";
  const dispatch = createEventDispatcher();

  const getPrompts = () => {
    dispatch("getPrompts");

    extComm.GET("activeModePrompts").then((data) => {
      activeModePrompts.set(data);
    });
  };

  export let prompt: PromptDefinition & { promptId: string; mode: Mode };

  const modeChanged = () => {
    const found = $uniqueModeStore.find((mode) => mode.id === prompt.modeId)!;

    if (found) {
      prompt.mode = found;
    }
  };

  const savePrompt = () => {
    if (prompt.promptId) {
      extComm.UPDATE("prompt", prompt).then(() => {
        getPrompts();
      });
    } else {
      extComm.CREATE("prompt", prompt).then((data) => {
        prompt = data;
        getPrompts();
      });
    }
  };

  onMount(() => {
    getPrompts();
  });

  let showConfirmDelete = false;

  const deletePrompt = () => {
    showConfirmDelete = false;
    extComm.DELETE("prompt", prompt).then(() => {
      getPrompts();
      dispatch("promptDeleted");
    });
  };

  let showInterpolationHelp = false;

  const close = () => {
    dispatch("close");
  };
</script>

<div class="space-y-2 p-2 w-full">
  <div class="flex justify-end">
    <Button variant="secondary" on:click={close}>Close</Button>
  </div>
  <div class="flex-1 flex flex-col">
    <label for="label">Label</label>
    <input type="text" bind:value={prompt.title} name="label" />
  </div>
  <div class="flex-1 flex flex-col">
    <label for="description">Description</label>
    <input type="text" bind:value={prompt.description} name="description" />
  </div>
  <div class="flex-1 flex flex-col">
    <label for="category">Category</label>
    <input type="text" bind:value={prompt.category} name="category" />
  </div>
  <div class="flex-1 flex flex-col">
    <label for="mode">Mode</label>
    <select bind:value={prompt.modeId} on:change={modeChanged} name="mode">
      {#each $uniqueModeStore as mode}
        <option value={mode?.id}>{mode.label}</option>
      {/each}
    </select>
  </div>
  <div class="flex-1 flex flex-col">
    <label for="insertionMethod">Insertion method</label>
    <select bind:value={prompt.insertionMethod} name="insertionMethod">
      <option value="none">None</option>
      <option value="replace">Replace selection</option>
      <option value="before">Before selection</option>
      <option value="after">After selection</option>
      <option value="new">New window</option>
    </select>
  </div>
  <div class="flex-1 flex flex-col">
    <label for="message">Message</label>
    <textarea
      class="overflow-y-auto min-h-[150px] max-h-[150px]"
      bind:value={prompt.message}
      name="message"
    />
    <div class="text-xs mt-2">
      <Button variant="secondary" size="sm" on:click={() => showInterpolationHelp = true}>View supported placeholders</Button>
      <ConfirmationDialog open={showInterpolationHelp} on:close={() => showInterpolationHelp = false}>
        <ul class="list-disc pl-4 space-y-4">
          <li>
            <code>{"{{"}ft{"}}"}</code> - Converts to the language ID of the active
            window, e.g. "cpp".
          </li>
          <li>
            <code>{"{{"}language{"}}"}</code> - Takes the language ID of the active
            window, e.g. "cpp" and converts it to a human-readable language name, e.g.
            "C++". Works with all known VSCode language identifiers.
          </li>
          <li>
            <code>{"{{"}input{"}}"}</code> - Prompts for, and is replaced by, user
            input. Additionally, you can use the
            <code>{"{{"}input:Here's some hint text?{"}}"}</code> format to provide hint text
            for the input.
          </li>
          <li>
            <code>{"{{"}selection{"}}"}</code> - Replaced with the current selection
            in the active editor.
          </li>
          <li>
            <code>{"{{"}:PARAM:VAL{"}}"}</code> - Set a completion parameter for the prompt when it is dispatched, e.g. <code>{"{{"}:top_k:4{"}}"}</code>.
          </li>
          <!-- <li>
            <code>{"{{"}language_instructions{"}}"}</code> - A map of language ID
            to additional prompt instructions. For example,
            <code>{"{"} cpp: "Use modern C++ syntax" {"}"}</code>. When the active
            document has a language ID that matches one of the keys,
            <code>{"{{"}language_instructions{"}}"}</code> will be replaced with the
            value.
          </li> -->
        </ul>
      </ConfirmationDialog>
    </div>
  </div>
  <!-- <pre>{JSON.stringify(prompt, null, 2)}</pre> -->
  <div class="flex-1 flex justify-between">
    <Button variant="secondary" class="mr-2" on:click={savePrompt}>Save</Button>
    {#if prompt?.promptId}
      <Button variant="danger" class="mr-2" on:click={() => showConfirmDelete = true}>Delete</Button>
      <ConfirmationDialog open={showConfirmDelete} on:close={() => showConfirmDelete = false}>
        <p>
          Are you sure you want to delete this prompt? This action cannot be undone.
        </p>
        <div class="flex justify-center mt-4">
          <Button variant="danger" on:click={deletePrompt}>Yes, delete</Button>
        </div>
      </ConfirmationDialog>
    {/if}
  </div>
</div>

<style lang="scss">
  input[type="text"],
  textarea,
  select {
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-input-foreground);

    @apply transition-all h-6;

    &:focus {
      outline: none;
      border-color: var(--vscode-inputOption-activeBorder);
    }
  }

  label {
    @apply text-xs opacity-70 mb-0 font-semibold;
  }
</style>
