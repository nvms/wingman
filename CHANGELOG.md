<!-- https://keepachangelog.com/en/1.0.0/ -->

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