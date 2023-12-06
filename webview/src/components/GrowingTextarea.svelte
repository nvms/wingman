<script>
  import { onMount, createEventDispatcher, tick } from "svelte";

  export let value = "";
  export let name = "";
  export let placeholder = "";
  let className = "";
  export let enterCreatesNewLine = false; // Prop to control Enter key behavior
  export { className as class };

  const dispatch = createEventDispatcher();
  let textArea;

  export function focus() {
    textArea.focus();
  }

  export function setValue(v) {
    value = v;
    tick().then(() => {
      autoGrow();
    });
  }

  // Emit event or create new line based on enterCreatesNewLine prop
  function handleKeydown(event) {
    dispatch("keydown", event);
    if (event.key === "Enter") {
      if (!event.shiftKey && !enterCreatesNewLine) {
        event.preventDefault();
        dispatch("submit", value);
      } else if (!event.shiftKey && enterCreatesNewLine) {
        event.preventDefault();
        value += "\n";
        tick().then(() => {
          autoGrow();
        });
      }
    }
  }

  function autoGrow() {
    textArea.style.height = "auto";
    textArea.style.height = textArea.scrollHeight + "px";
  }

  onMount(() => {
    textArea.addEventListener("input", autoGrow);
    tick().then(() => {
      autoGrow();
    });
  });
</script>

<textarea
  bind:this={textArea}
  bind:value
  on:keydown={handleKeydown}
  {placeholder}
  {name}
  class={`textarea resize-none border ${className} overflow-y-auto`}
  wrap="hard"
  style="width: 100%; max-width: 100%;"
/>

<style lang="scss">
  textarea {
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-input-foreground);
    max-height: 200px;

    @apply transition-all h-6;

    &:focus {
      outline: none;
      border-color: var(--vscode-inputOption-activeBorder);
    }
  }
</style>
