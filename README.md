# wingman

A Visual Studio Code extension with ChatGPT (3.5 and 4) or LLaMa integration with _**highly extensible and COMPLETELY CUSTOMIZABLE PROMPTING**_ templates. No magic. No shenanigans. These are your prompts, with a few built-in defaults to get you started.

To use a local LLaMa model for completely offline generation, set `wingman.apiBaseUrl` to your local API URL and `wingman.model` to your desired model. This works best with something like [https://github.com/go-skynet/LocalAI](LocalAI). Whatever API you choose to use just has to implement the same REST interface as the OpenAI API - _this is exactly what LocalAI does_.

<center>

![example image](.github/example1.png)

</center>

## Quickstart

1. Install the extension.
2. Create an OpenAI account and get an API key (if you're using ChatGPT for generation).
3. Add your API key to your settings under `wingman.apiKey`: open Settings, search for "wingman", and paste your API key into the input field labeled "Api key".
4. Open VScode's bottom panel by pressing <kbd>CTRL + J</kbd> or <kbd>CMD + J</kbd> and select the `Wingman` tab (pictured above).
5. Highlight a block of code and click "Refactor" in the Wingman tab to refactor the selected code. The generated code will automatically replace the selected text.
6. Explore all of the other commands.

## Features

- **User-defined commands** - Easily create your own commands with custom prompt templates.
  
<center>

![example configuration](.github/example2.png)

</center>

- **Language-specific elaboration** - Use vscode's language identifier to define language-specific elaboration. Add `{{language_instructions}}` to your templates:

  ```json
   {
    "command": "doc",
    "label": "Write documentation",
    "userMessageTemplate":
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite really good documentation using best practices for the given language. Attention paid to documenting parameters, return types, any exceptions or errors. Don't change the code. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else.",
    "languageInstructions": {
      "cpp": "Use doxygen style comments for functions.",
      "java": "Use javadoc style comments for functions.",
      "typescript": "Use TSDoc style comments for functions.",
      "javascript": "Use JSDoc style comments for functions.",
    },
    "callbackType": "replace",
    "contextType": "selection"
  }
  ```

- **Automatically replaces selected text** - OPTIONAL. If you have text selected, it will automatically replace it with the generated code block. This can be disabled or enabled per-command.
- **Continue the conversation** - After the model replies to your request, you can continue the conversation by using the input field below. Conversation context is preserved until you start a new request. This gives you the opportunity to follow-up on the models' response, e.g., "What happens if the second parameter is null or undefined?" or "Can you also add a test that ensures the method throws expectedly when given bad input?".
- **Elaboration/additional context** - OPTIONAL. If your command defines a `{{command_args}}` in its template, it will prompt you for elaboration on the command. This can be disabled or enabled per-command.
- **Configurable API url** - This is particularly useful if you're using something like [https://github.com/go-skynet/LocalAI](LocalAI), i.e. you want your wingman to be driven by a local LLaMa model.
- **Configurable model** - `gpt-3.5-turbo` or `gpt-4` are the two options currently available. `gpt-3.5-turbo` is the default. This is currently an `enum` but will likely be changed to a `string` in the future to allow for more flexibility, e.g. if you're using `LocalAI` and want to use a custom model like `ggml-gpt4all-j`.
- **Cancel requests** - Cancel an in-progress request.
- **String interpolation** - Use `{{language}}`, `{{command_args}}`, `{{text_selection}}`, `{{filetype}}`, and `{{language_instructions}}` in your templates (`userMessageTemplate` and `systemMessageTemplate` supported) to automatically fill in values.

## String interpolations

| Interpolation | Description |
| ------------- | ----------- |
| `{{language}}` | The language identifier of the current file. |
| `{{command_args}}` | The arguments passed to the command. When this is present, you will be prompted for additional input when the command button is clicked. |
| `{{text_selection}}` | The selected text. |
| `{{filetype}}` | The file type of the current file. |
| `{{language_instructions}}` | The language-specific instructions for more generic commands, like the `doc` example above. |

## Command interface

You can create your own commands by adding them to your settings under `wingman.userCommands`. Your commands need to implement the `Command` interface:

```typescript
export interface Command {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  numberOfChoices?: number;
  command: string;
  label: string;
  userMessageTemplate: string;
  systemMessageTemplate?: string;
  languageInstructions?: {
    [languageId: string]: string;
  };
  callbackType?: CallbackType;
  contextType: ContextType;
  category?: string;
}
```

This is what the default, base command looks like:

```typescript
export const baseCommand: Command = {
  maxTokens: 4096,
  numberOfChoices: 1,
  model: "gpt-3.5-turbo",
  temperature: 0.8,
  command: "default",
  label: "Default",
  systemMessageTemplate: "You are a {{language}} coding assistant.",
  userMessageTemplate: "",
  callbackType: CallbackType.Buffer,
  languageInstructions: {
    javascript: "Use modern JavaScript syntax.",
    typescript: "Use modern TypeScript syntax.",
    cpp: "Use modern C++ features.",
    html: "Use modern HTML syntax.",
    csharp: "Use modern C# syntax.",
  },
  contextType: ContextType.Selection,
  category: "Default",
};
```

When you create your own command, you can override any of these properties. The only required properties are `command`, `label`, `userMessageTemplate`, and `contextType`.

## Command properties

| Property | Description |
| -------- | ----------- |
| `model` | The model to use. Currently, only `gpt-3.5-turbo` and `gpt-4` are supported. |
| `maxTokens` | See OpenAI API docs. |
| `numberOfChoices` | See OpenAI API docs. |
| `temperature` | See OpenAI API docs. |
| `command` | The command name. This value is used to register the command with vscode: `wingman.<command>`. |
| `label` | The label for the command to show in the UI. |
| `systemMessageTemplate` | See OpenAI API docs. |
| `userMessageTemplate` | The template for the user message. Automatically fills values for `{{language}}`, `{{command_args}}`, `{{text_selection}}`, `{{filetype}}`, and `{{language_instructions}}`. |
| `callbackType` | The type of callback to use: `CallbackType.Buffer`, `CallbackType.Replace`, `CallbackType.AfterSelected` |
| `languageInstructions` | A map of language identifiers to instructions for the given `userMessageTemplate`. |
| `contextType` | The type of context to use: `ContextType.Selection` or `ContextType.None` |
| `category` | The category to place the command under in the UI. |

## Default commands

| Command | Description |
| ------- | ----------- |
| Completion | Completes the selected text |
| Write documentation | Writes documentation for the selected text |
| Write unit tests | Writes unit tests for the selected text |
| Refactor | Refactors the selected code without changing its functionality, focusing on readability and maintainability |
| Analyze for bugs | Examines the selected code to alert you of possible bugs |
| Explain | Provides an explanation of the code |
| Optimize for performance | Attempt to optimize the selected code, considering performance, readability, etc. |
| Modify | Makes changes to the selected code |
| Chat | Chat with only the selected code as context. |
| Question | Asks a question about the selected code |


## TODO

- `CallbackType.Buffer` doesn't do anything at the moment. The desired behavior is to stick all generated code blocks into a panel at the end of the response, and stick a "copy" button above each block.