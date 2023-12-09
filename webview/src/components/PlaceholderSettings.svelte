<script lang="ts">
  import extComm from "@/messaging";
  import { onMount } from "svelte";
  import Button from "./Button.svelte";
  import GrowingTextarea from "./GrowingTextarea.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";
  import type { Placeholder, Placeholders } from "../../../shared";

  let placeholders: Placeholders = {};

  function getPlaceholders() {
    extComm.GET("placeholders").then((data) => {
      placeholders = data;
    });
  }

  let placeholderForEditing: Placeholder | undefined;

  function editPlaceholder(id) {
    placeholderForEditing = {
      id,
      key: placeholders[id].key,
      value: placeholders[id].value,
    };
  }

  function savePlaceholder() {
    if (!placeholderForEditing) return;

    if (placeholderForEditing.key) {
      placeholderForEditing.key = placeholderForEditing.key.trim();
    }

    if (!placeholderForEditing.id) {
      extComm.CREATE("placeholder", placeholderForEditing).then((data) => {
        getPlaceholders();
        placeholderForEditing = data;
      });
    } else {
      extComm.UPDATE("placeholder", placeholderForEditing).then((data) => {
        getPlaceholders();
        placeholderForEditing = data;
      });
    }
  }

  function createPlaceholder() {
    placeholderForEditing = { id: "", key: "", value: "" };
  }

  onMount(() => {
    getPlaceholders();
  });

  let showConfirmDelete = false;

  const deletePlaceholder = () => {
    showConfirmDelete = false;
    extComm.DELETE("placeholder", placeholderForEditing).then(() => {
      placeholderForEditing = undefined;
      getPlaceholders();
    });
  };
</script>

<div class="flex flex-1 bg-gray-500/5">
  <div class="flex-0 border-r border-panel overflow-y-auto">
    <div class="font-semibold px-4 pt-2 select-none">Placeholders</div>
    <div class="flex flex-col">
      {#each Object.entries(placeholders) as [id, placeholder]}
        <button
          class={`${placeholderForEditing?.id === id ? "active" : ""}`}
          on:click={() => editPlaceholder(id)}
        >
          {placeholder.key}
        </button>
      {/each}
    </div>
  </div>
  {#if placeholderForEditing}
    <div class="flex-1 p-2 flex flex-col overflow-x-hidden overflow-y-auto space-y-4">
      <div class="flex justify-end">
        <Button
          variant="secondary"
          on:click={() => (placeholderForEditing = undefined)}>Close</Button
        >
      </div>
      {#if placeholderForEditing.key}
        <div>
          <code>{`{{`}{placeholderForEditing.key}{`}}`}</code> can be used in prompts or other placeholders.
        </div>
      {:else}
        <div>
          Please enter a key for this placeholder.
        </div>
      {/if}
      <div class="flex-1 flex flex-col">
        <label for="key">Key</label>
        <input type="text" bind:value={placeholderForEditing.key} name="key" />
      </div>
      <div class="flex-1 flex flex-col">
        <label for="value">Value</label>
        <GrowingTextarea
          class="w-full"
          enterCreatesNewLine={true}
          bind:value={placeholderForEditing.value}
          name="value"
          maxHeight="500px"
        />
      </div>

      <div class="flex justify-between mt-2">
        <div>
          {#if placeholderForEditing.id}
            <Button variant="secondary" on:click={savePlaceholder}>Save</Button>
          {/if}
          {#if !placeholderForEditing.id}
            <Button variant="secondary" on:click={savePlaceholder}
              >Create</Button
            >
          {/if}
        </div>
        {#if placeholderForEditing.id}
          <ConfirmationDialog
            open={showConfirmDelete}
            on:close={() => (showConfirmDelete = false)}
          >
            <p>
              Are you sure you want to delete this placeholder? This action
              cannot be undone.
            </p>
            <div class="flex justify-center mt-4">
              <Button variant="danger" on:click={deletePlaceholder}
                >Yes, delete</Button
              >
            </div>
          </ConfirmationDialog>
          <div>
            <Button variant="danger" on:click={() => (showConfirmDelete = true)}
              >Delete</Button
            >
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if !placeholderForEditing}
    <div
      class="flex-1 flex flex-col overflow-x-hidden overflow-y-auto justify-center align-middle items-center my-4 space-y-4"
    >
      <div class="max-w-[768px]">
        Placeholders are used to insert dynamic values into your prompts. Placeholders can include other placeholders, but be careful not to create circular references between them.
      </div>

      <Button variant="secondary" size="lg" on:click={createPlaceholder}>
        Create New Placeholder
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

  input[type="text"] {
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
