<!-- https://keepachangelog.com/en/1.0.0/ -->

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