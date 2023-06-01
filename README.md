# wingman

A Visual Studio Code extension with ChatGPT integration with highly extensible and customizable prompting templates, and a number of defaults to get you started.

<center>

![example image](.github/example1.png)

</center>

## Features

- **User-defined commands** - Easily create your own commands with custom prompt templates.
  
<center>

![example configuration](.github/example2.png)

</center>

- **Automatically replaces selected text** - OPTIONAL. If you have text selected, it will automatically replace it with the generated code block. This can be disabled or enabled per-command.
- **Elaboration/additional context** - OPTIONAL. If your command defines a `{{commandArgs}}` in its template, it will prompt you for elaboration on the command. This can be disabled or enabled per-command.
- **Configurable API url** - This is particularly useful if you're using something like [https://github.com/go-skynet/LocalAI](LocalAI), i.e. you want your wingman to be driven by a local LLaMa model.
- **Configurable model** - `gpt-3.5-turbo` or `gpt-4` are the two options currently available. `gpt-3.5-turbo` is the default. This is currently an `enum` but will likely be changed to a `string` in the future to allow for more flexibility, e.g. if you're using `LocalAI` and want to use a custom model like `ggml-gpt4all-j`.