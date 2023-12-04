<script lang="ts" context="module">
  export type ChatMessage = {
    from: "user" | "assistant";
    message: string;
  };

  export type Conversation = {
    id: string;
    archived: Date;
    messages: ChatMessage[];
  };
</script>

<script lang="ts">
  import extComm from "@/messaging";
  import { activeMode, activePreset } from "@/store";
  import type { Category } from "@/types";
  import { onMount, tick } from "svelte";
  import { ChatEvents } from "../../../shared";
  import Button from "./Button.svelte";
  import ChatHistoryList from "./ChatHistoryList.svelte";
  import CommandCategory from "./CommandCategory.svelte";
  import ConversationMessage from "./ConversationMessage.svelte";
  import PresetSettings from "./PresetSettings.svelte";
  import PromptSettings from "./PromptSettings.svelte";
  import Sidebar from "./Sidebar.svelte";
  import ModeSettings from "./ModeSettings.svelte";
  import ExtensionSettings from "./ExtensionSettings.svelte";

  export let showPresetSettings = false;
  export let showPromptSettings = false;
  export let showModeSettings = false;
  export let showExtensionSettings = false;
  export let categories: Category[] = [];
  let description = "";
  let disableSidebar = false;
  let input;

  function showDescription(event) {
    const title = event.target.textContent;
    for (const category of categories) {
      const matchingItem = category.items.find((item) => item.title === title);
      if (matchingItem) {
        description =
          matchingItem.description +
          "\n\nPROMPT\n======\n\n" +
          matchingItem.message;
        return;
      }
    }
  }

  function hideDescription() {
    description = "";
  }

  const runCommand = (item) => {
    if (disableSidebar) {
      return;
    }

    closeConversation();

    const { promptId } = item;
    extComm.RUN(promptId);
  };

  let conversationContainer;

  const scrollToBottom = () => {
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
  };

  let conversationHistory: Conversation[] = [];
  let chats: ChatMessage[] = [];
  let responseInProgress = false;

  const listenChatInitiated = extComm.on(ChatEvents.ChatInitiated, () => {
    disableSidebar = true;
    chats = [];
    responseInProgress = true;
  });

  const listenChatEnded = extComm.on(ChatEvents.ChatEnded, async () => {
    disableSidebar = false;
    responseInProgress = false;

    await tick();

    input.focus();

    scrollToBottom();
  });

  $: canCloseConversation = chats.length && !responseInProgress;

  const listenChatMessageReceived = extComm.on(
    ChatEvents.ChatMessageReceived,
    async (message) => {
      const lastMessage = chats[chats.length - 1];
      if (lastMessage.from === "assistant") {
        const newLastMessage = {
          from: "assistant",
          message: String(message.value),
        } as ChatMessage;
        chats = [...chats.slice(0, chats.length - 1), newLastMessage];
      } else {
        chats = [...chats, { from: "assistant", message: message.value }];
      }

      await tick();

      scrollToBottom();
    },
  );

  const listenChatMessageSent = extComm.on(
    ChatEvents.ChatMessageSent,
    async (message) => {
      chats = [...chats, { from: "user", message: message.value }];
      responseInProgress = true;
      disableSidebar = true;

      await tick();

      scrollToBottom();
    },
  );

  const listenAbort = extComm.on("aborted", () => {
    responseInProgress = false;
    disableSidebar = false;
    input.focus();
  });

  const getHistory = () => {
    extComm.GET("chatHistory").then((history) => {
      if (history && history.length) {
        conversationHistory = history;

        // Go through the history and turn the `archived` property back into a Date object.
        conversationHistory = conversationHistory.map((conversation) => {
          conversation.archived = new Date(conversation.archived);
          return conversation;
        });
      }
    });
  };

  activeMode.subscribe(() => {
    getHistory();
  });

  onMount(() => {
    tick().then(() => {
      input?.focus?.();
    });

    getHistory();

    return () => {
      listenChatInitiated();
      listenChatEnded();
      listenChatMessageReceived();
      listenChatMessageSent();
      listenAbort();
    };
  });

  export const closeConversation = () => {
    if (!chats.length) return;

    const keep = 30;

    const newConversation: Conversation = {
      id: String(Date.now()),
      archived: new Date(),
      messages: chats,
    };

    conversationHistory = [newConversation, ...conversationHistory];

    if (conversationHistory.length > keep) {
      conversationHistory = conversationHistory.slice(0, keep);
    }

    extComm.UPDATE("chatHistory", conversationHistory);

    chats = [];
  };

  const cancel = () => {
    extComm.ABORT();
  };

  const onInputKeydown = (e) => {
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        e.target.value += "\n";
        return;
      }

      // Don't allow submission if we're still receiving a reply.
      if (responseInProgress) return;

      const input = e.target.value;

      if (input.trim() === "") {
        return;
      }

      e.target.value = "";
      extComm.SEND(input);
    }
  };

  // I need to be able to list my chats, and the assistant chats.
</script>

<div class="flex-1 flex flex-col overflow-hidden">
  {#if showPresetSettings}
    <div class="flex-0 border-b border-panel">
      <PresetSettings />
    </div>
  {/if}
  {#if showPromptSettings}
    <div class="flex-0 border-b border-panel">
      <PromptSettings on:getPrompts />
    </div>
  {/if}
  {#if showModeSettings}
    <div class="flex-0 border-b border-panel">
      <ModeSettings on:getPrompts />
    </div>
  {/if}
  {#if showExtensionSettings}
    <div class="flex-0 border-b border-panel">
      <ExtensionSettings on:getPrompts />
    </div>
  {/if}
  <div class="flex flex-1 overflow-hidden">
    <Sidebar>
      {#each categories as category}
        <CommandCategory category={category.category} disabled={disableSidebar}>
          {#each category.items as item}
            <button
              on:click={() => runCommand(item)}
              class="items-center"
              on:mouseenter={showDescription}
              on:mouseleave={hideDescription}
            >
              {item.title}
            </button>
          {/each}
        </CommandCategory>
      {/each}
    </Sidebar>
    <div
      class="flex-1 flex flex-col justify-between opacity-100 overflow-hidden relative h-full p-2 items-center"
    >
      {#if description}
        <div class="absolute z-10 top-2 right-2 left-2 p-2 bg-gray-700 text-white">
          <pre class="whitespace-pre-wrap">{description}</pre>
        </div>
      {/if}

      {#if chats.length === 0 && conversationHistory.length > 0}
        <div class="flex flex-col overflow-auto px-5 items-center w-full">
          <ChatHistoryList chatHistory={conversationHistory} />
        </div>
      {/if}

      <div
        class="flex flex-col overflow-auto px-5 items-center w-full"
        bind:this={conversationContainer}
      >
        {#each chats as chat, index}
          <ConversationMessage
            from={chat.from}
            message={chat.message}
            responseInProgress={responseInProgress && chat.from === "assistant"}
            isLastMessage={index === chats.length - 1}
          />
        {/each}
      </div>

      <div class="flex-0 px-5 flex flex-col justify-center items-center w-full">
        <div class="w-full max-w-[768px]">
          {#if chats.length !== 0}
            <input
              bind:this={input}
              type="text"
              class="w-full border border-panel p-2"
              placeholder="Chat"
              on:keydown={onInputKeydown}
            />
          {/if}
        </div>
        <status-bar class="w-full max-w-[768px] pt-2 flex justify-between h-8">
          <div class="flex items-center">
            {#if responseInProgress}
              <Button variant="danger" size="md" class="mr-2" on:click={cancel}
                >Cancel</Button
              >
            {/if}

            {#if canCloseConversation}
              <Button variant="secondary" size="md" on:click={closeConversation}
                >Close conversation</Button
              >
            {/if}
          </div>
          <div class="flex-0 flex justify-end items-center text-xs">
            <div class="ml-8">
              <div class="flex flex-col items-end">
                <span class="opacity-50">Active preset</span>
                <span>{$activePreset?.name}</span>
              </div>
            </div>
          </div>
        </status-bar>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  input[type="text"] {
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-input-foreground);

    @apply transition-all;

    &:focus {
      outline: none;
      border-color: var(--vscode-inputOption-activeBorder);
    }
  }
</style>
