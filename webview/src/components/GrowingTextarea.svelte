<script>
  import { onMount, createEventDispatcher, tick, onDestroy } from "svelte";

  export let value = "";
  export let name = "";
  export let placeholder = "";
  export let maxHeight = "200px";
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
        const selectionStart = event.target.selectionStart;
        const selectionEnd = event.target.selectionEnd;
        value = value.slice(0, selectionStart) + "\n" + value.slice(selectionEnd);
        event.target.value = value; // Set the textarea value to the updated value
        event.target.selectionStart = event.target.selectionEnd = selectionStart + 1;
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

  onDestroy(() => {
    if (textArea) {
      textArea.removeEventListener("input", autoGrow);
    }
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
  style="width: 100%; max-width: 100%; max-height: {maxHeight};"
/>

<style lang="scss">
  textarea {
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-input-foreground);

    @apply transition-all h-6;

    &:focus {
      outline: none;
      border-color: var(--vscode-inputOption-activeBorder);
    }
  }
</style>
