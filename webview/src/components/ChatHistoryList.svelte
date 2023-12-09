<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import Button from "./Button.svelte";
  import ConversationMessage from "./ConversationMessage.svelte";
  import type { Conversation } from "./ModeView.svelte";

  const dispatch = createEventDispatcher();

  export let chatHistory: Conversation[] = [];
  let activeHistoryConversation: Conversation | null;

  const setActiveHistoryConversation = (conversation: Conversation | null) => {
    activeHistoryConversation = conversation;

    if (conversation === null) {
      dispatch("toggleHistoryMessage", false);
    } else [
      dispatch("toggleHistoryMessage", true),
    ]

    tick().then(() => {
      scrollToBottom();
    });
  };

  let container;

  const scrollToBottom = () => {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  function timeAgo(date: Date): string {
    const seconds: number = Math.floor(
      (new Date().getTime() - date.getTime()) / 1000,
    );

    const interval: number = Math.floor(seconds / 31536000);
    const intervalMonths: number = Math.floor(seconds / 2592000);
    const intervalDays: number = Math.floor(seconds / 86400);
    const intervalHours: number = Math.floor(seconds / 3600);
    const intervalMinutes: number = Math.floor(seconds / 60);

    const formatTime = (value: number, unit: string): string => {
      if (value > 1) {
        return `${value} ${unit}s ago`;
      }
      if (value === 1) {
        return `${value} ${unit} ago`;
      }
      return "";
    };

    return (
      formatTime(interval, "year") ||
      formatTime(intervalMonths, "month") ||
      formatTime(intervalDays, "day") ||
      formatTime(intervalHours, "hour") ||
      formatTime(intervalMinutes, "minute") ||
      "just now"
    );
  }
</script>

<div class="overflow-y-auto w-full flex flex-col items-center space-y-2">
  {#if !activeHistoryConversation}
    {#each chatHistory as conversation}
      <div class="conversation">
        <Button
          variant="subtle"
          size="sm"
          on:click={() => setActiveHistoryConversation(conversation)}
        >
          <div>
            <div class="">Archived conversation</div>
            <div class="flex justify-between items-center opacity-50 space-x-4">
              <div>
                {conversation.archived.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                  hour12: true,
                  timeZoneName: "short",
                })}
              </div>
              <div>
                {timeAgo(conversation.archived)}
              </div>
            </div>
          </div>
        </Button>
      </div>
    {/each}
  {:else}
    <div bind:this={container} class="space-y-4">
      <div class="flex justify-center">
        <Button
          variant="subtle"
          size="lg"
          on:click={() => setActiveHistoryConversation(null)}
        >
          Back
        </Button>
      </div>
      <div class="conversation">
        {#each activeHistoryConversation.messages as message}
          <ConversationMessage
            showCompareSource={false}
            from={message.from}
            message={message.message}
            responseInProgress={false}
          />
        {/each}
      </div>
      <div class="flex justify-center">
        <Button
          variant="subtle"
          size="lg"
          on:click={() => setActiveHistoryConversation(null)}
        >
          Back
        </Button>
      </div>
    </div>
  {/if}
</div>
