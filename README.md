# lifebar-editor

A read+write editor for a [OpenKakutou](https://github.com/openkakutou) (MUGEN/Ikemen GO-compatible) lifebar: the health bar, power bar, combo counter, and round display UI. It parses and serializes the lifebar `.def`-style format directly in this app, and uses the sibling [`sff`](https://github.com/openkakutou/sff) WebAssembly build to decode sprite sheets for assigning sprites to lifebar elements.

<!-- vibe:begin:features -->
This project is in early-stage development. Available now:

- A themed app shell, built on the shared OpenKakutou design system, with a light/dark-aware layout.
- Load a lifebar file to edit by selecting it or dragging it onto the app — MUGEN and Ikemen GO-specific files alike, with unrecognized Ikemen extensions preserved rather than dropped. A malformed file shows a clear error naming the exact line that failed to parse instead of crashing.

Planned:

- Browse and assign sprites to lifebar elements via the `sff` WebAssembly build
- Edit element position/layout for the life bar, power bar, combo counter, round display, and more
- Save/export edits back to the lifebar file format
- A new-lifebar wizard: create a lifebar from scratch or a starter template
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
- [docs/architecture.md](docs/architecture.md) — how the app is put together: the main modules, the lifebar data model, and how a file flows through them.
- [docs/testing.md](docs/testing.md) — how the test suite is structured, including how the parser is tested and test-environment quirks worked around.
<!-- vibe:end:docs-index -->
