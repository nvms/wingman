<script lang="ts" context="module">
  export type PromptWithMode = PromptDefinition & {
    promptId: string;
    mode: Mode;
  };
</script>

<script lang="ts">
  import extComm from "@/messaging";
  import {
    activeMode,
    activeModePrompts,
    activePreset,
    modeStore,
    presets,
    uniqueModeStore,
  } from "@/store";
  import type { Category } from "@/types";
  import hljs from "highlight.js";
  import { marked } from "marked";
  import { markedHighlight } from "marked-highlight";
  import { onMount } from "svelte";
  import Notifications from "svelte-notifications";
  import {
    ChatEvents,
    type Mode,
    type Preset,
    type PromptDefinition,
  } from "../../../shared";
  import EventListener from "./EventListener.svelte";
  import ModeView from "./ModeView.svelte";
  import Wizard from "./Wizard.svelte";

  marked.use(
    markedHighlight({
      langPrefix: "hljs language-",
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : "javascript";
        return hljs.highlight(code, { language }).value;
      },
    }),
  );

  function uniqBy<T>(
    array: T[],
    iteratee: ((item: T) => unknown) | keyof T,
  ): T[] {
    const seen = new Set<unknown>();
    return array.filter((item) => {
      const key =
        typeof iteratee === "function" ? iteratee(item) : item[iteratee];
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  let prompts = {};
  let modes: Mode[] = [];

  let showWizard = false;

  extComm.GET("welcomeWizard").then((data) => {
    showWizard = data;
  });

  const getPrompts = () => {
    extComm.GET("prompts").then((data) => {
      prompts = data;
      getModes();
    });
  };

  const getModes = () => {
    extComm.GET("modes").then((data) => {
      modes = data;
    });
  };

  const setActiveMode = (mode: Mode) => {
    const found = modes.find((m) => m.id === mode.id);
    if (found) {
      activeMode.set(found);
    }

    extComm.GET("activeModePrompts").then((data) => {
      activeModePrompts.set(data);
    });

    extComm.GET("activePreset").then((data) => {
      activePreset.set(data);
    });

    extComm.GET("presets").then((data) => {
      presets.set(data);
    });
  };

  // Bound to ModeView. When the active mode is changed (i.e. when the user navigates to a new mode),
  // we call closeConversation which archives any active conversation.
  let closeConversation;

  activeMode.subscribe((value) => {
    if (!value) return;
    closeConversation?.();
    extComm.SET("activeMode", value);
    getPrompts();
  });

  extComm.GET("prompts").then((data) => {
    prompts = data;
    modeStore.set(modes);
    activeMode.set(modes[0]);

    getModes();

    extComm.GET("activeMode").then((data: Mode) => {
      if (!data) return;
      setActiveMode(data);
    });

    extComm.GET("activePreset").then((data: Preset) => {
      if (!data) return;
      activePreset.set(data);
    });
  });

  let uniqueModes: Mode[] = [];

  $: {
    uniqueModes = uniqBy(modes, "id");
    uniqueModeStore.set(uniqueModes);
  }

  $: getCategories = (id: string): Category[] => {
    const out = Object.values(prompts).filter(
      // @ts-ignore
      (prompt: PromptWithMode) =>
        prompt.modeId === id,
    );

    // @ts-ignore
    return out.reduce((acc: any, prompt: any) => {
      const found = acc.find((item: any) => item.category === prompt.category);

      if (found) {
        found.items.push(prompt);
      } else {
        acc.push({
          category: prompt.category,
          items: [prompt],
        });
      }

      return acc;
    }, []);
  };

  let currentCategories: Category[] = [];

  $: {
    currentCategories = getCategories($activeMode?.id);
  }

  let showPresetSettings = false;
  let showPromptSettings = false;
  let showExtensionSettings = false;
  let showModeSettings = false;

  const toggleSetting = (
    setting: "preset" | "prompt" | "extension" | "mode",
  ) => {
    if (setting === "preset" && showPresetSettings) {
      showPresetSettings = false;
      return;
    }

    if (setting === "prompt" && showPromptSettings) {
      showPromptSettings = false;
      return;
    }

    if (setting === "extension" && showExtensionSettings) {
      showExtensionSettings = false;
      return;
    }

    if (setting === "mode" && showModeSettings) {
      showModeSettings = false;
      return;
    }

    showPresetSettings = setting === "preset";
    showPromptSettings = setting === "prompt";
    showExtensionSettings = setting === "extension";
    showModeSettings = setting === "mode";
  };

  let disableNavigation = false;

  const listenChatInitiated = extComm.on(ChatEvents.ChatInitiated, () => {
    disableNavigation = true;
  });

  const listenChatMessageSent = extComm.on(ChatEvents.ChatMessageSent, () => {
    disableNavigation = true;
  });

  const listenChatEnded = extComm.on(ChatEvents.ChatEnded, () => {
    disableNavigation = false;
  });

  const listenAborted = extComm.on("aborted", () => {
    disableNavigation = false;
  });

  onMount(() => {
    return () => {
      listenChatInitiated();
      listenChatMessageSent();
      listenChatEnded();
      listenAborted();
    };
  });
</script>

<Notifications>
  <EventListener />

  {#if showWizard}
    <div
      class="top-0 right-0 bottom-0 left-0 absolute bg-panel z-10 flex justify-center items-center"
    >
      <Wizard on:confirmWizard={() => (showWizard = false)} />
    </div>
  {/if}

  <div class="h-full flex flex-col">
      <header class="py-0 flex-0 flex justify-between">
        <div
          class={`flex-1 flex flex-col ${
            disableNavigation ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <div class="px-2 flex flex-col border-b border-panel main-bg">
            <div class="flex">
              {#each uniqueModes as mode}
                <button on:click={() => setActiveMode(mode)}>
                  <div
                    class={`mode-icon ${
                      $activeMode?.id === mode.id ? "active" : ""
                    } py-2 px-2`}
                  >
                    {mode.label}
                  </div>
                </button>
              {/each}
            </div>
          </div>
          <div class="flex flex-col px-2 main-bg">
            <!-- <div class="px-2 text-xs opacity-50 mt-2 leading-none">
              Settings
            </div> -->
            <div class="flex">
              <button on:click={() => toggleSetting("mode")}>
                <div
                  class={`mode-icon py-2 px-2 ${
                    showModeSettings ? "active" : ""
                  }`}
                >
                  Modes
                </div>
              </button>
              <button on:click={() => toggleSetting("preset")}>
                <div
                  class={`mode-icon py-2 px-2 ${
                    showPresetSettings ? "active" : ""
                  }`}
                >
                  Presets
                </div>
              </button>
              <button on:click={() => toggleSetting("prompt")}>
                <div
                  class={`mode-icon py-2 px-2 ${
                    showPromptSettings ? "active" : ""
                  }`}
                >
                  Prompts
                </div>
              </button>
              <button on:click={() => toggleSetting("extension")}>
                <div
                  class={`mode-icon py-2 px-2 ${
                    showExtensionSettings ? "active" : ""
                  }`}
                >
                  Extension
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-hidden flex main-bg">
        {#if $activeMode?.id}
          <ModeView
            bind:closeConversation
            {showModeSettings}
            {showPresetSettings}
            {showPromptSettings}
            {showExtensionSettings}
            categories={currentCategories}
            on:getPrompts={getPrompts}
          />
        {/if}
      </main>
  </div>
</Notifications>

<style lang="scss">
  header {
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .sidebar {
    @apply border-r;
    border-color: var(--vscode-panel-border);
  }

  .main-bg {
    background: var(--vscode-sideBar-background);
  }

  .mode-icon {
    border-bottom: 2px solid transparent;
  }

  .mode-icon.active {
    border-bottom: 2px solid var(--vscode-activityBar-activeBorder);
  }
</style>
