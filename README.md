# lifebar-editor

A read+write editor for a [OpenKakutou](https://github.com/openkakutou) (MUGEN/Ikemen GO-compatible) lifebar: the health bar, power bar, combo counter, and round display UI. It parses and serializes the lifebar `.def`-style format directly in this app, and uses the sibling [`sff`](https://github.com/openkakutou/sff) WebAssembly build to decode sprite sheets for assigning sprites to lifebar elements.

<!-- vibe:begin:features -->
This project is in early-stage development. Available now:

- A themed app shell, built on the shared OpenKakutou design system, with a light/dark-aware layout.
- Load a lifebar file to edit by selecting it or dragging it onto the app — MUGEN and Ikemen GO-specific files alike, with unrecognized Ikemen extensions preserved rather than dropped. A malformed file shows a clear error naming the exact line that failed to parse instead of crashing.
- Load a `.sff` sprite sheet and browse its sprites as thumbnails, grouped the way the file organizes them, in preparation for assigning them to lifebar elements. A missing sprite sheet WASM build or a corrupt file shows a clear, specific error instead of failing silently.
- Select any element of the loaded lifebar (life bar, power bar, combo counter, round display, and more) and edit its properties, and assign a sprite to any property that references one by picking it from the loaded sprite sheet. An element that needs a sprite sheet not loaded yet, or that references a sprite the loaded sheet doesn't actually have, is clearly flagged — even before opening it — instead of failing silently or corrupting the file.
- Save/export the edited lifebar as a downloadable file. If a sprite assignment still needs attention, exporting shows a clear warning naming the affected element instead of leaving in-progress work stuck with no way to save it — an explicit "Export anyway" choice is offered. A value that this file format simply can't store safely blocks the export outright until it's fixed, so a file is never silently exported broken.
- Start a brand-new lifebar without loading a file first — blank, or from a bundled starter template with a life bar and power bar already set up. Starting a new one while the current one has unsaved edits asks for confirmation, naming what would be lost.
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
Requires [Node.js](https://nodejs.org/) `^20.19.0` or `>=22.12.0`.

```sh
npm install
```

Verify the install worked by running the test suite:

```sh
npm test
```

To update dependencies to their latest allowed versions:

```sh
npm update
```

Download a specific version of the `sff` library's WebAssembly build (needed to browse a sprite sheet):

```sh
npm run wasm:download -- v0.2.0
```
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
Start a local dev server with hot reload:

```sh
npm run dev
```

Build the static site for production (output in `dist/`):

```sh
npm run build
```

Preview a production build locally:

```sh
npm run preview
```

Run the test suite:

```sh
npm test
```

Run the linter/formatter (auto-fixes issues in place):

```sh
npm run lint
```
<!-- vibe:end:usage -->

<!-- vibe:begin:docs-index -->
- [docs/architecture.md](docs/architecture.md) — how the app is put together: the main modules, the lifebar data model, and how loading a lifebar file or a sprite sheet flows through them.
- [docs/testing.md](docs/testing.md) — how the test suite is structured, including how the parser and the WASM bridge are tested and test-environment quirks worked around.
<!-- vibe:end:docs-index -->
