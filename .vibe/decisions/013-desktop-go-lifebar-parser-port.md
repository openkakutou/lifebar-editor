---
date: 2026-10-07
status: accepted
---
# Desktop build parses lifebars with a Go port of the web parser, kept inside `desktop/`

**Context:** Backlog item 014 ships a native Fyne desktop app that loads and saves lifebar `.def` files "through the same Go libraries the web build uses". Unlike `stage-editor`, which parses stages with the sibling `stage` Go library, lifebar has no Go library: the web build parses and serializes in TypeScript (`src/lifebar/parse.ts`, `serialize.ts`), by decision `009`, which deliberately avoids a separate lifebar library repo.

**Decision:** Port the parser and serializer to Go as `desktop/internal/lifebar`, inside this repo, with the same generic, unevaluated data model (ordered sections and entries, never maps) and the same line-level error rules. The Fyne app consumes that package; it does not call into the web build.

**Reason:** Keeps decision `009`'s rule (no separate lifebar library repo) while giving the native build a Go parser it can compile into the binary, with no WASM runtime or webview. The format is small (about 100 lines in each language), so a faithful port is cheap to keep correct; the fixture round-trip test in `desktop/internal/lifebar` pins the behavior against the same real `fight.def` the web build's visual test uses.

**Rejected alternatives:**
- *New `lifebar` Go library repo, shared by web and desktop* — contradicts decision `009`, and would need a new release pipeline for a format this small.
- *Load the web build's WASM from the Fyne app* — pulls a WebAssembly runtime into a native binary for a parser that is already native-sized; no gain.
- *Reuse the stage-editor's Go code by copying it* — the stage format and the lifebar format differ; a copy would be a fork of unrelated logic.

**Known risk:** the two parsers are maintained separately. Drift is only caught by the shared fixture, not by a cross-language golden test. Any change to the TypeScript parser must be mirrored in `desktop/internal/lifebar`.
