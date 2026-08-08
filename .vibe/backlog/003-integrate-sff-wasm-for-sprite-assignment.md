---
status: todo
depends_on: [002]
---
# Integrate `sff` WASM For Sprite Assignment

## Description
A lifebar's elements (life bar, power bar, combo counter, round display, etc.) reference sprites from one or more `.sff` sprite sheets. Add a bridge to the `sff` library's WebAssembly build (github.com/openkakutou/sff) that decodes a sprite sheet client-side and lets the user browse its sprites (thumbnails, group/index identifiers), so sprites can subsequently be assigned to lifebar elements (item 004). No Go toolchain or server involved — the WASM module is loaded and called entirely in the browser, same pattern as `character-viewer-web`'s bridge to the `character` WASM build.

## Acceptance Criteria
- [ ] User can load an `.sff` sprite sheet file and browse its sprites (thumbnails plus group/index identifiers) via the `sff` WASM build
- [ ] Decoded sprite metadata is exposed in a form the elements editor (item 004) can consume for sprite assignment
- [ ] A missing or not-yet-downloaded WASM build shows a clear setup error instead of a silent failure
- [ ] A malformed or corrupt `.sff` file shows a clear error state instead of crashing the page

## Notes
Cross-repo: blocked on `sff` backlog item 004 (WASM entrypoint) being released before this can be implemented against a real build.
