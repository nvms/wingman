<script lang="ts">
  import CodeIcon from "./icons/CodeIcon.svelte";
  import PencilLineIcon from "./icons/PencilLineIcon.svelte";
  import ChevronRightIcon from "./icons/ChevronRightIcon.svelte";
  import GearFineIcon from "./icons/GearFineIcon.svelte";

  export let category = "Category";
  export let disabled = false;

</script>

<div class={`font-semibold px-4 py-2 select-none border-b border-neutral-500/50 mb-2 ${disabled ? "opacity-30": ""}`}>{category}</div>
<div class={`command-list pb-2 ${disabled ? "pointer-events-none opacity-30 cursor-not-allowed" : ""}`}>
  <slot></slot>
</div>

<style lang="scss">
.command-list :global {
  @apply flex flex-col;
  button {
    @apply px-4 py-0 cursor-pointer opacity-80 text-left;

    &:hover {
      background: var(--vscode-list-hoverBackground);
      opacity: 1;
      text-decoration: underline;
    }

    &:active {
      opacity: 0.8;
    }
  }
}
</style>

