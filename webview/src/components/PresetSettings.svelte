<script lang="ts">
  import extComm from "@/messaging";
  import { activePreset, presets } from "@/store";
  import { onMount } from "svelte";
  import type { Preset } from "../../../shared";
  import PresetForm from "./PresetForm.svelte";
  import CheckCircleIcon from "./icons/CheckCircleIcon.svelte";

  const getPresets = () => {
    extComm.GET("presets").then((data) => {
      presets.set(data);
    });
  };

  const getActiveModePreset = () => {
    extComm.GET("activePreset").then((data) => {
      activePreset.set(data);
    });
  };

  onMount(() => {
    getPresets();
    getActiveModePreset();
  });

  let preset;

  const setAsActivePreset = (preset: Preset) => {
    extComm.SET("activePreset", preset).then(() => {
      activePreset.set(preset);
    });
  };

  activePreset.subscribe((value) => {
    preset = value;
  });
</script>

<div class="flex flex-1 bg-gray-500/5">
  <div class="flex-0 border-r border-panel overflow-x-hidden overflow-y-auto">
    <div class="font-semibold px-4 pt-2 select-none">Presets</div>
    <div class="flex flex-col">
      {#if $presets && $presets.length}
        {#each $presets as preset}
          <button
            on:click={() => setAsActivePreset(preset)}
            class={`${
              preset?.id === $activePreset?.id ? "active" : ""
            } cursor-pointer opacity-50 flex justify-between`}
          >
          <div>
            {preset?.name}
          </div>
          <div class="min-w-4">
            {#if preset?.id === $activePreset?.id}
              <CheckCircleIcon class="ml-2 w-4 h-4 active-icon" />
            {/if}
          </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <div class="flex-1 p-2 flex flex-col overflow-x-hidden overflow-y-auto">
    <PresetForm preset={$activePreset} on:getPresets={getPresets} />
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

  .active-icon {
    color: var(--vscode-activityBar-activeBorder);
  }
</style>
