<script lang="ts">
  import extComm from "@/messaging";
  import { activeMode, activePreset } from "@/store";
  import { createEventDispatcher } from "svelte";
  import { generateId, type Preset } from "../../../shared";
  import Button from "./Button.svelte";
  import TagInput from "./TagInput.svelte";

  export let preset: Preset;
  let presetClone = { ...preset };
  let providers: string[] = [];
  let tokenizers: string[] = [];
  let formats: string[] = [];

  const dispatch = createEventDispatcher();

  const getPresets = () => {
    dispatch("getPresets");
  };

  activeMode.subscribe((value) => {
    extComm.GET("activePreset").then((data) => {
      activePreset.set(data);
    });
  });

  extComm.GET("providers").then((data) => {
    providers = data;
  });

  extComm.GET("tokenizers").then((data) => {
    tokenizers = data;
  });

  extComm.GET("formats").then((data) => {
    formats = data;
  });

  activePreset.subscribe((value) => {
    presetClone = { ...value };
  });

  const savePreset = () => {
    extComm.UPDATE("preset", presetClone).then(() => {
      getPresets();

      extComm.GET("activePreset").then((data) => {
        activePreset.set(data);
      });
    });
  };

  const savePresetAs = () => {
    const id = generateId();
    const newPreset = {
      ...presetClone,
      id,
    };

    extComm.CREATE("newPreset", newPreset).then(() => {
      getPresets();

      extComm.GET("activePreset").then((data) => {
        activePreset.set(data);
      });
    });
  };

  const deletePreset = () => {
    extComm.DELETE("preset", presetClone.id).then(() => {
      getPresets();

      extComm.GET("activePreset").then((data) => {
        activePreset.set(data);
      });
    });
  };

  const getNewCompletionParams = () => {
    extComm.GET("providerCompletionParams", presetClone.provider).then((data) => {
      presetClone.completionParams = data;
    });
  };
</script>

<div class="w-full flex-1 flex">
  {#if preset}
    <form class="flex flex-1 flex-col" on:submit|preventDefault={() => {}}>
      <div class="w-full">
        <div class="flex-1 flex flex-col">
          <label for="system">System message</label>
          <textarea class="overflow-y-auto min-h-[150px] max-h-[150px]" bind:value={presetClone.system} name="system" />
        </div>
      </div>
      <div class="w-full flex mt-2">
        <div class="flex-1 space-y-2 mr-2">
          <div class="flex-1 flex flex-col">
            <label for="name">Preset name</label>
            <input type="text" bind:value={presetClone.name} name="name" />
          </div>

          <div class="flex-1 flex flex-col">
            <label for="url">URL</label>
            <input type="text" bind:value={presetClone.url} name="url" />
          </div>

          <div class="flex-1 flex flex-col">
            <label for="provider">Provider</label>
            <select bind:value={presetClone.provider} name="provider" on:change={getNewCompletionParams}>
              {#each providers as provider}
                <option value={provider}>{provider}</option>
              {/each}
            </select>
          </div>

          <!-- <div class="flex-1 flex flex-col">
            <label for="tokenizer">Tokenizer</label>
            <select bind:value={presetClone.tokenizer} name="tokenizer">
              {#each tokenizers as tokenizer}
                <option value={tokenizer}>{tokenizer}</option>
              {/each}
            </select>
          </div> -->

          <!-- <div class="flex-1 flex flex-col">
            <label for="format">Format</label>
            <select bind:value={presetClone.format} name="format">
              {#each formats as format}
                <option value={format}>{format}</option>
              {/each}
            </select>
          </div> -->

          <!-- <pre>{JSON.stringify(presetClone, null, 2)}</pre> -->

        </div>
        <div class="flex-1 space-y-2">
          {#each Object.entries(presetClone.completionParams) as [key, value]}
            <div class="flex-1 flex flex-col">
              <label for={key}>{key}</label>
              {#if typeof value === "string"}
                <input
                  type="text"
                  bind:value={presetClone.completionParams[key]}
                  name={key}
                />
              {:else if typeof value === "number"}
                <input
                  type="number"
                  step="any"
                  bind:value={presetClone.completionParams[key]}
                  name={key}
                />
              {:else if typeof value === "boolean"}
                <input
                  type="checkbox"
                  bind:checked={presetClone.completionParams[key]}
                  name={key}
                />
              {:else if Array.isArray(value)}
                <TagInput
                  bind:value={presetClone.completionParams[key]}
                  name={key}
                />
              {:else if typeof value === "object"}
                <textarea
                  class="h-12"
                  bind:value={presetClone.completionParams[key]}
                  name={key}
                />
              {/if}
            </div>
          {/each}
        </div>
      </div>
      <div class="flex justify-between mt-2">
        <div>
          <Button variant="secondary" class="mr-2" on:click={savePreset}>Save</Button>
          <Button variant="secondary" on:click={savePresetAs}>Save As...</Button>
        </div>
        <div>
          <Button variant="danger" on:click={deletePreset}>Delete</Button>
        </div>
      </div>
    </form>
  {/if}
</div>

<style lang="scss">
  input[type="text"],
  input[type="number"],
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
