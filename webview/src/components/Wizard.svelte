<script lang="ts">
  import extComm from "@/messaging";
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import Button from "./Button.svelte";
  import FeatherIcon from "./icons/FeatherIcon.svelte";

  const dispatch = createEventDispatcher();
  let step = "welcome";

  const confirm = () => {
    if (step === "presets") {
      extComm.SET("welcomeWizard", false);
      dispatch("confirmWizard");
    } else if (step === "welcome") {
      step = "modes";
    } else {
      step = "presets";
    }
  };
</script>

<div class="grid grid-container" transition:fade={{ duration: 200 }}>
  {#if step === "welcome"}
    <div
      transition:fade={{ duration: 200 }}
      class="flex justify-center items-center flex-col space-y-4 max-w-[600px]"
    >
      <div class="">
        <FeatherIcon class="w-20 h-20" />
      </div>
      <div class="text-lg">Welcome to Wingman!</div>
      <div class="space-y-2 text-lg opacity-80">
        <p style="text-align: center;">
          This release is quite different than the previous versions of Wingman.
        </p>
        <p style="text-align: center;">
          There are some breaking changes, but overall we think you'll agree that
          the experience has been largely improved.
        </p>
      </div>
      <div>
        <Button variant="primary" size="lg" on:click={confirm}>Next</Button>
      </div>
    </div>
  {:else if step === "modes"}
    <div
      transition:fade={{ duration: 200 }}
      class="flex justify-center items-center flex-col space-y-4 max-w-[600px]"
    >
      <div class="text-lg">Modes</div>
      <div class="space-y-2 text-lg opacity-80">
        <p style="text-align: center;">
          We've introduced "modes", and there are three default modes included:
          Programming, Creative writing, and Technical writing. You can switch between
          modes quickly by selecting it from the top bar. You can create as many modes
          as you want, and customize them to your needs.
        </p>
      </div>
      <div>
        <Button variant="primary" size="lg" on:click={confirm}>Next</Button>
      </div>
    </div>
  {:else if step === "presets"}
    <div
      transition:fade={{ duration: 200 }}
      class="flex justify-center items-center flex-col space-y-4 max-w-[600px]"
    >
      <div class="text-lg">Presets</div>
      <div class="space-y-2 text-lg opacity-80">
        <p style="text-align: center;">
          Each mode has its own set of presets, and you can customize them to
          your needs or create new presets for each mode.
        </p>
        <p style="text-align: center;">
          Hmm
        </p>
      </div>
      <div>
        <Button variant="primary" size="lg" on:click={confirm}
          >Let's go!</Button
        >
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .grid-container > * {
    grid-area: 1 / 1;
  }
</style>
