# Ubiquitous Language

## Lifebar
A MUGEN/Ikemen GO lifebar `.def`-style file (conventionally `fight.def`): the health bar, power bar, combo counter, and round display UI definition this app edits. Parsed into an ordered list of Sections.
_Sources: `src/lifebar/document.ts`, `src/lifebar/parse.ts`_

## Section
One `[Section Name]` block of a Lifebar file (e.g. `[Life Bar 0]`), holding an ordered list of Entries. A section name can legitimately repeat across a real file, so Sections are stored as a list, not keyed by name. The elements editor UI calls a Section an "element" (e.g. "Elements (2)") — the same concept, user-facing wording only.
**Do not confuse with:** Entry, which is a single `key = value` line within a Section, not a block of its own.
_Sources: `src/lifebar/document.ts`, `src/lifebar/parse.ts`, `src/editor/elements-editor.ts`_

## Entry
A single `key = value` line within a Section, kept as raw, unevaluated text rather than a typed field — the same "don't over-model a format this item doesn't fully interpret yet" approach the sibling `character` library applies to its own `.cns`/`.cmd` controllers. A key can legitimately repeat within one Section, so Entries are stored as a list, not keyed by name.
_Sources: `src/lifebar/document.ts`, `src/lifebar/parse.ts`_

## Sprite reference
An Entry whose key ends in `.spr` (e.g. `p1.bg0.spr`), holding a `"group, image"` pair that names one specific Sprite in the loaded Sprite sheet — the real MUGEN/Ikemen GO fight.def convention for a static (non-animated) sprite assignment. The elements editor resolves one against the loaded Sprite sheet into one of four states: no sheet loaded yet, unset (empty value), invalid (malformed text, or a group/image the sheet doesn't actually have), or valid. See `.vibe/decisions/004-spr-suffix-identifies-sprite-reference-entries.md`.
**Do not confuse with:** Entry, the general key/value shape a Sprite reference is one specific, recognized case of.
_Sources: `src/editor/sprite-reference.ts`_

## Sprite sheet
A MUGEN/Ikemen GO `.sff` file: a collection of Sprites, organized into Sprite groups, that a Lifebar's elements reference for their visuals (the life bar/power bar fill graphics, the combo counter digits, and so on). Decoded via the sibling `sff` library's WebAssembly build, not reimplemented in this app.
**Do not confuse with:** Lifebar, which is the separate `.def`-style file that *references* a sprite sheet's sprites — this app parses each with its own independent logic.
_Sources: `src/wasm/types.ts`, `src/wasm/bridge.ts`, `src/viewer/sprite-browser.ts`_

## Sprite
One image within a Sprite sheet, identified by its group and image index (e.g. group 0, image 3), with its own pixel dimensions, pivot (axis) point, and palette reference. Its metadata is always available once a sheet loads; its actual decoded pixels are resolved separately, on demand.
_Sources: `src/wasm/types.ts`_
