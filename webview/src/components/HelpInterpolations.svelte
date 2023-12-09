<div class="p-2 space-y-2">
  <h2 class="text-lg">Placeholders</h2>
  <p class="opacity-80">
    These are variables that can be used in your prompts. They are surrounded by
    curly braces.
  </p>
  <ul>
    <li>
      <code>{"{{"}ft{"}}"}</code> - Converts to the language ID of the active window, e.g. "cpp".
    </li>
    <li>
      <code>{"{{"}language{"}}"}</code> - Takes the language ID of the active window,
      e.g. "cpp" and converts it to a human-readable language name, e.g. "C++". Works
      with all known VSCode language identifiers.
    </li>
    <li>
      <code>{"{{"}input{"}}"}</code> - Prompts for, and is replaced by, user input. Additionally, you can
      use <code>{"{{"}input:Here's some hint text?{"}}"}</code> to provide hint text for the input.
    </li>
    <li>
      <code>{"{{"}selection{"}}"}</code> - Replaced with the current selection in the active editor.
    </li>
    <li>
      <code>{"{{"}file{"}}"}</code> - Replaced with the contents of the active editor.
    </li>
    <li>
      <code>{"{{"}language_instructions{"}}"}</code> - A map of language ID to additional prompt instructions.
      For example, <code>{"{"} cpp: "Use modern C++ syntax" {"}"}</code>. When the active document has a language
      ID that matches one of the keys, <code>{"{{"}language_instructions{"}}"}</code> will be replaced with the value.
    </li>
  </ul>
  <br />
</div>
