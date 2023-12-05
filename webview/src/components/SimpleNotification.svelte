<script>
  export let notification = {};

  $: notificationClass = `
      ${notification.type === "error" ? "error" : ""}
      ${notification.type === "success" ? "success" : ""}
      ${notification.type === "warning" ? "warning" : ""}
      ${notification.type === "info" ? "info" : ""}
      absolute top-2 right-2 z-50 flex items-center px-2 h-[23px]
    `;
</script>

<div class={notificationClass}>
  <p class="whitespace-nowrap">{notification.text}</p>
</div>

<style lang="scss">
  .error {
    @apply bg-red-700/80 text-white;
  }

  .success {
    @apply bg-green-700/80 text-white;
  }

  .warning {
    @apply bg-yellow-700/80 text-white;
  }

  .info {
    @apply bg-blue-700/80 text-white;
  }
</style>
