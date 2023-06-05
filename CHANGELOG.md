<!-- https://keepachangelog.com/en/1.0.0/ -->

## 1.0.21 - 2023-06-05

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
