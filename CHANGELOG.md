# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-08-18

### Added

- Users can now load a lifebar file to edit by selecting it or dragging it onto the app — MUGEN and Ikemen GO-specific files alike, with unrecognized Ikemen extensions preserved rather than dropped. A malformed file shows a clear error naming the exact line that failed to parse instead of crashing.

## [0.2.0] - 2026-08-17

### Added

- Adopted the shared `web-ui-kit` design system as this app's root frame: a themed layout shell with the app title and version, styled entirely with design tokens instead of ad-hoc CSS. If the design system fails to load, a clear error message is shown instead of a broken or blank page.

[Unreleased]: https://github.com/openkakutou/lifebar-editor/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/openkakutou/lifebar-editor/releases/tag/v0.2.0
