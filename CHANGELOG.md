<!-- https://keepachangelog.com/en/1.0.0/ -->

## 1.3.8 - 2023-06-21

### Added

- Added a "Write function and inline comments" command under the "Documentation & comments" category.
- Added a "Log variables" command under the "Analysis" category.
- Added a "More meaningful variable names" command under the "Refactor" category.

### Changed

- Don't require a `command` property to be defined.
- Renamed the default "Analysis" category to "Analysis & debugging"

## 1.3.7 - 2023-06-20

### Changed

- `{{command_args}}` is now `{{input}}`.

### Added

- Spinner while waiting for initial response to request.

## 1.3.2 - 2023-06-11

### Changed

- Small style changes.
- Add avatars.

## 1.3.1 - 2023-06-11

### Changed

- Remove `contextType` from `wingman.userCommands` `items` definition as it's no longer needed.

## 1.3.0 - 2023-06-11

### Added

- Anthroic support!

### Fixed

- A bug where the model specified in settings.json wasn't used because the base command was always overriding it.

## 1.2.10 - 2023-06-10

### Changed

- Really minor CSS change.

## 1.2.9 - 2023-06-10

### Changed

- Default prompt example has changed, because the previous one has been baked into the default list.
- Category expansion behaves like an accordion now.

## 1.2.8 - 2023-06-10

### Added

- Added a "Translate" default prompt category.

### Changed

- Changed some of the default command prompts.
- Updated list styles a bit.
- When a response is received or aborted, the input field is now automatically focused.

## 1.2.4 - 2023-06-09

### Added

- Optional command descriptions.
- Optionally hide command descriptions.
- Added a number of builtin commands.

### Changed

- Improved default command category labels.
- Command list styling.

## 1.2.3 - 2023-06-08

### Changed

- Use `marked-highlight`.
- When highlight language cannot be determined, fallback to `javascript`.

### Fixed

- `marked` doesn't throw an error when it encounters an unknown language now that we're using `marked-highlight`. This error resulted in the entire panel being blank.

## 1.2.0 - 2023-06-06

### Changed

- Add `ContextType.BeforeSelected`. Generated code blocks are placed before the selected code block.
- Change some of the SVGs for clarity.
- Change `doc` builtin command a bit, have it use `ContextType.BeforeSelected`.
- Refactor some utils.

### Added

- Config items:
  - `wingman.context.ignore.useGitignore`: Whether to respect `.gitignore` when determining project-wide context for models with larger context windows.
  - `wingman.context.ignore.additionalIgnorePaths`: Additional paths to ignore when determining project-wide context for models with larger context windows.
- Add utils in preparation for Claude, mainly `getFilesForContextFormatted`, which:
  - Optionally respects `.gitignore` (`wingman.context.ignore.useGitignore`).
  - Respects `.wmignore` in all open workspace roots, just like a `.gitignore`.

## 1.1.1 - 2023-06-05

### Fixed

- Parsing generated output is now improved so that we can better identify the language from the response and apply the right stylings with hljs. The result is much less flickering and more consistent styling.

## 1.1.0 - 2023-06-05

### Changed

Pretty significant refactor along with the introduction of the providers API.

#### Config changes

Certain configuration property names have changed with the introduction of the providers API. The following properties have been renamed:

- `wingman.apiKey` -> `wingman.openai.apiKey`
- `wingman.apiBaseUrl` -> `wingman.openai.apiBaseUrl`
- `wingman.model` -> `wingman.openai.model`
- `wingman.temperature` -> `wingman.openai.temperature`

In an effort to preserve backwards compatibility, the old property names will continue to work as a fallback for the time being (`wingman.openai.apiKey` is prioritized over `wingman.apiKey`), but until the old names are removed from `settings.json`, you will see a warning when wingman starts up.

#### Provider API

The completion logic has been abstracted to a provider API, which means that in the future it will be much easier for other providers, like Anthropic, to be supported. The provider API is still in its early stages, and the only provider currently supported is OpenAI. The OpenAI provider API still works with a local LLaMa solution like LocalAI, but the configuration property names have changed (see above).

Currently, the plan is to allow for providers to be defined on a per-command basis, e.g., your `Refactor function` could be handled by ChatGPT, while your `Refactor module` could be handled by Anthropic. The command list in the UI will include an indicator for the provider used by the command.

## 1.0.19 - 2023-06-03

### Fixed

- Fixed the bug where the builtin commands were categorized as "Uncategorized". They're now correctly categorized as "Builtin default" and "Builtin miscellaneous".

## 1.0.18 - 2023-06-03

### Changed

- When the wingman panel is toggled visible, and there's an active conversation, the input field is now automatically focused.

## 1.0.17 - 2023-06-02

### Added

- `grammar` command to `Builtin miscellaneous` category.

### Changed

- Renamed the default categories to reduce collision with user-defined categories.

## 1.0.16 - 2023-06-02

### Added

- `CallbackType.None` does nothing with the response.

### Fixed

- `CallbackType.Buffer` now actually puts the response in a new buffer.

## 1.0.11 - 2023-06-01

### Changed

- `wingman.model` is now a string, allowing for arbitrary models to be specified, e.g. for usage with `LocalAI`. The default value is still `gpt-3.5-turbo` and `gpt-4` is still supported.

## 1.0.9 - 2023-06-01

### Changed

- Use github dark for hljs theme

## 1.0.8 - 2023-06-01

### Changed

- Input remains disabled while a request is in progress.

## 1.0.7 - 2023-06-01

### Added

- Collapsible categories, persisted between sessions.

## 1.0.6 - 2023-06-01

### Changed

- `doc` prompt has additional context.

### Added

- `CallbackType.AfterSelection`
