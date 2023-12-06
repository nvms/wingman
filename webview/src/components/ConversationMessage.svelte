<script lang="ts">
  import AIAvatarIcon from "./icons/AIAvatarIcon.svelte";
  import UserAvatarIcon from "./icons/UserAvatarIcon.svelte";
  import Highlighter from "./Highlighter.svelte";
  import Button from "./Button.svelte";
  import { getNotificationsContext } from "svelte-notifications";
  import extComm from "@/messaging";
  import { createEventDispatcher, tick } from "svelte";

  export let from: "user" | "assistant" = "user";
  export let message: string = "";
  export let responseInProgress = false;
  export let isLastMessage = false;
  export let showCompareSource = true;

  const dispatch = createEventDispatcher();
  let messageBlock;
  let codeElements: HTMLElement[] = [];
  let searchedForCodeElements = false;

  const { addNotification } = getNotificationsContext();

  $: {
    if (!responseInProgress && !searchedForCodeElements && messageBlock && message.length) {
      searchedForCodeElements = true;
      codeElements = messageBlock.querySelectorAll("pre > code");
    }

    if (codeElements.length) {
      let skip = false;
      codeElements.forEach((codeElement) => {
        // if the data-actions already exist, skip=true and return.
        if (codeElement.parentElement?.querySelector("[data-actions]")) {
          skip = true;
          return;
        }

        const flex = document.createElement("div");
        flex.setAttribute("data-actions", "");
        codeElement.parentNode?.appendChild(flex);
      });

      if (!skip) {
        codeElements.forEach((codeElement) => {
          const button = document.createElement("button");
          button.textContent = "Copy";
          button.classList.add("action-button");
          button.addEventListener("click", () => {
            navigator.clipboard.writeText(codeElement.textContent?.trim() || "");
            addNotification({
              text: "Copied to clipboard",
              position: "top-center",
              type: "info",
              removeAfter: 1000,
            });
          });
          codeElement.parentElement?.querySelector("[data-actions]")?.appendChild(button);
        });

        if (from === "assistant") {
          codeElements.forEach((codeElement) => {
            const button = document.createElement("button");
              button.textContent = "Compare with selection";
              button.classList.add("action-button");
              button.addEventListener("click", () => {
                const contents = codeElement.textContent?.trim() || "";
                extComm.DIFF_SELECTION(contents);
              });
              codeElement.parentElement?.querySelector("[data-actions]")?.appendChild(button);
          });
        }

        if (showCompareSource) {
          if (from === "assistant") {
            codeElements.forEach((codeElement) => {
                const button = document.createElement("button");
                button.textContent = "Compare with source";
                button.classList.add("action-button");
                button.addEventListener("click", () => {
                  const contents = codeElement.textContent?.trim() || "";
                  extComm.DIFF(contents);
                });
                codeElement.parentElement?.querySelector("[data-actions]")?.appendChild(button);
            });
          }
        }

        codeElements.forEach((codeElement) => {
          if (from === "assistant") {
            const button = document.createElement("button");
            button.textContent = "Replace selection";
            button.classList.add("action-button");
            button.addEventListener("click", () => {
              const contents = codeElement.textContent?.trim() || "";
              extComm.REPLACE_SELECTION(contents);
            });
            codeElement.parentElement?.querySelector("[data-actions]")?.appendChild(button);
          }
        });
      }

      setTimeout(() => {
        dispatch("scrollToBottom");
      }, 50); // :shrug:
    }
  }
</script>
  
<div class="mb-4 w-full max-w-[768px]">
  <div class="flex items-start">
    {#if from === "user"}
      <UserAvatarIcon class="w-6 h-6 mr-2" />
    {:else if from === "assistant"}
      <AIAvatarIcon class="w-6 h-6 mr-2" />
    {/if}
    <div class="flex-1 overflow-hidden">
      <div class="message p-4 flex flex-col max-w-[768px]" bind:this={messageBlock}>
        <Highlighter code={message} />
        {#if responseInProgress && isLastMessage}
          <svg class="mt-2 animate-spin h-6 w-6 foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        {/if}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .foreground {
    color: var(--vscode-foreground);
  }

  .message :global {
    @apply rounded-md flex justify-start self-start leading-4;
    // @apply bg-neutral-500/20;
    @apply border border-neutral-500/40;

    .dot {
      @apply w-8 h-8 rounded-full ml-2;
      @apply animate-ping;
      background: var(--vscode-foreground);
    }

    h1 {
      @apply text-2xl font-bold;
    }

    h2 {
      @apply text-xl font-bold;
    }

    h3 {
      @apply text-lg font-bold;
    }

    h4 {
      @apply text-base font-bold;
    }

    h5 {
      @apply text-sm font-bold;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      @apply mb-2 leading-10;
    }

    ol {
      @apply list-decimal list-inside ml-4;
    }

    ul {
      @apply list-disc list-inside ml-4;
    }

    * {
      @apply leading-5;
    }

    .hljs {
      @apply my-4;
    }

    /* The last item is the details. But the item before that is the last message piece. No margin. */
    > :nth-last-child(2) {
      @apply mb-0;
    }
  }
</style>
