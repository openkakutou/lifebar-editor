# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-09-03

### Added

- Every edit made in the elements editor can now be undone and redone, with dedicated Undo/Redo buttons in the toolbar that show whether either is currently available. Starting or loading a different lifebar clears the undo history, so it never tries to reapply an edit against the wrong document.

## [0.7.0] - 2026-08-31

### Added

- Users can now start a brand-new lifebar without loading a file first: either blank, or from a bundled starter template with a life bar and power bar already set up. Starting a new lifebar while the current one has unsaved edits asks for confirmation first, naming what would be lost.

## [0.6.0] - 2026-08-27

### Added

- Users can now save/export their edited lifebar as a downloadable `.def`-style file, preserving every element and sprite assignment. If a sprite reference still needs attention (unresolved, or no sprite sheet loaded) the export shows a clear warning naming the affected element, with an explicit "Export anyway" option instead of losing in-progress work; a value that can't safely be stored in this file format (containing a `;`) blocks the export outright until fixed, so a file is never silently exported broken.

## [0.5.0] - 2026-08-20

### Added

- Users can now select any element of a loaded lifebar (life bar, power bar, combo counter, round display, and so on) and edit its properties directly, and assign a sprite to any property that references one by picking from the loaded sprite sheet. An element needing a sprite sheet that isn't loaded yet, or referencing a sprite the loaded sheet doesn't actually have, is flagged clearly — even while collapsed — instead of failing silently or corrupting the file.

## [0.4.0] - 2026-08-19

### Added

- Users can now load a `.sff` sprite sheet and browse its sprites as thumbnails, grouped the same way the file organizes them, in preparation for assigning sprites to lifebar elements. A missing sprite sheet WASM build shows a clear setup message instead of a silent failure, and a corrupt or unreadable file shows a clear error naming the problem.

## [0.3.0] - 2026-08-18

### Added

- Users can now load a lifebar file to edit by selecting it or dragging it onto the app — MUGEN and Ikemen GO-specific files alike, with unrecognized Ikemen extensions preserved rather than dropped. A malformed file shows a clear error naming the exact line that failed to parse instead of crashing.

## [0.2.0] - 2026-08-17

### Added

- Adopted the shared `web-ui-kit` design system as this app's root frame: a themed layout shell with the app title and version, styled entirely with design tokens instead of ad-hoc CSS. If the design system fails to load, a clear error message is shown instead of a broken or blank page.

[Unreleased]: https://github.com/openkakutou/lifebar-editor/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/openkakutou/lifebar-editor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/openkakutou/lifebar-editor/releases/tag/v0.2.0
