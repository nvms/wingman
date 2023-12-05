<script lang="ts">
  import extComm from "@/messaging";
  import { activeMode } from "@/store";
  import { createEventDispatcher } from "svelte";
  import type { Mode } from "../../../shared";
  import Button from "./Button.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";

  const dispatch = createEventDispatcher();

  export let mode: Mode = {
    id: "",
    label: "",
  };

  $: isCreate = mode.id === "" || mode.id === undefined;

  const saveMode = () => {
  extComm.UPDATE("mode", mode).then((data) => {               
      dispatch("getPrompts");
    });
  };

  const createMode = () => {
    extComm.CREATE("mode", mode).then((data) => {
      dispatch("getPrompts");
    });
  };
  
  const deleteMode = () => {
    showConfirmDelete = false;
    extComm.DELETE("mode", mode).then((data) => {
      extComm.GET("activeMode").then((data) => {
        activeMode.set(data);
        dispatch("getPrompts");
        close();
      });
    });
  };

  const close = () => {
    dispatch("close");
  };

  let showConfirmDelete = false;
</script>

<div class="space-y-2 p-2 w-full">
  <div class="flex justify-between">
    <div>
      <span class="font-semibold">{isCreate ? "Create" : "Edit"} mode</span>
    </div>
    <Button variant="secondary" on:click={close}>Close</Button>
  </div>
  <div class="w-full">
    <div class="flex-1 flex flex-col">
      <label for="mode.label">Label</label>
      <input type="text" bind:value={mode.label} name="mode.label" />
    </div>
  </div>
  <div class="w-full">
    <div class="flex-1 flex justify-between">
      <div>
        {#if isCreate}
          <Button variant="secondary" on:click={createMode}>Create</Button>
        {/if}
        {#if !isCreate}
          <Button variant="secondary" on:click={saveMode}>Save</Button>
        {/if}
      </div>
      <div>
        {#if !isCreate}
          <Button variant="danger" on:click={() => showConfirmDelete = true}>Delete</Button>
          <ConfirmationDialog open={showConfirmDelete} on:close={() => showConfirmDelete = false}>
            <p>
              Are you sure you want to delete this mode? This action cannot be undone.
            </p>
            <div class="flex justify-center mt-4">
              <Button variant="danger" on:click={deleteMode}>Yes, delete</Button>
            </div>
          </ConfirmationDialog>
        {/if}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
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
