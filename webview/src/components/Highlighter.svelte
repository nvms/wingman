<script lang="ts">
  import { marked } from "marked";

  export let code = "";
  let markup = "<span</span>";

  $: {
    markup = marked(code);
  }
</script>

<div class="space-y-4 overflow-hidden highlighter">
  {@html markup}
</div>

<style lang="scss">
  .highlighter :global pre {
    white-space: pre;
  }

  .highlighter :global pre > code:not(.hljs) {
    white-space: pre-wrap;
  }
</style>