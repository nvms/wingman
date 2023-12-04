<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Button from "./Button.svelte";
  import extComm from "@/messaging";

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
  }
</script>

<div class="flex-1 bg-neutral-500/10 space-y-6 p-4">
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">Restore defaults</h2>
    <p>
      This will restore the default settings for the extension. The original
      modes will be restored along with all default prompts and presets.
      Any stored API keys will not be removed.
    </p>
    <Button variant="danger" on:click={restore}>Restore</Button>
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
