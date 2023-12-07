<script lang="ts">
  import extComm from "@/messaging";
  import { createEventDispatcher, onMount } from "svelte";
  import Button from "./Button.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";

  const dispatch = createEventDispatcher();

  const getPrompts = () => {
    dispatch("getPrompts");
  };

  let providers: string[] = [];

  onMount(() => {
    extComm.GET("providers").then((data) => {
      providers = data;
    });
  });

  const setProviderKey = (provider: string) => {
    extComm.SET("apiKey", provider);
  };

  const restore = () => {
    extComm.RESTORE_DEFAULTS().then(() => {
      getPrompts();
    });

    showConfirmRestore = false;
  }

  let showConfirmRestore = false;

  const onConfirmRestore = () => {
    restore();
  };
</script>

<div class="flex-1 bg-gray-500/5 space-y-6 p-4">
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">Restore defaults</h2>
    <p>
      This will restore the default settings for the extension. The original
      modes will be restored along with all default prompts and presets.
      Any stored API keys will not be removed.
    </p>
    <Button variant="danger" on:click={() => showConfirmRestore = true}>Restore</Button>
    <ConfirmationDialog open={showConfirmRestore} on:close={() => showConfirmRestore = false}>
      <p>
        Are you sure you want to restore the defaults? You will lose any modes, presets or prompts you may have created.
      </p>
      <div class="flex justify-center mt-4">
        <Button variant="danger" on:click={onConfirmRestore}>Yes, restore</Button>
      </div>
    </ConfirmationDialog>
  </div>
  {#if providers.length}
    <div class="space-y-2">
      <h2 class="text-lg font-semibold">API keys</h2>
      <p>
        Select a provider to set an API key for.
      </p>
      <div class="space-y-2">
        {#each providers as provider}
          <div>
            <Button variant="secondary" on:click={() => setProviderKey(provider)}>{provider}</Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">Interpolations</h2>
    <h3 class="text font-semibold">Language instructions</h3>
    <p>
      WIP
    </p>
  </div>
</div>
