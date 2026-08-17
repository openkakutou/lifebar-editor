# Ubiquitous Language

## Lifebar
A MUGEN/Ikemen GO lifebar `.def`-style file (conventionally `fight.def`): the health bar, power bar, combo counter, and round display UI definition this app edits. Parsed into an ordered list of Sections.
_Sources: `src/lifebar/document.ts`, `src/lifebar/parse.ts`_

## Section
One `[Section Name]` block of a Lifebar file (e.g. `[Life Bar 0]`), holding an ordered list of Entries. A section name can legitimately repeat across a real file, so Sections are stored as a list, not keyed by name.
**Do not confuse with:** Entry, which is a single `key = value` line within a Section, not a block of its own.
_Sources: `src/lifebar/document.ts`, `src/lifebar/parse.ts`_

## Entry
A single `key = value` line within a Section, kept as raw, unevaluated text rather than a typed field — the same "don't over-model a format this item doesn't fully interpret yet" approach the sibling `character` library applies to its own `.cns`/`.cmd` controllers. A key can legitimately repeat within one Section, so Entries are stored as a list, not keyed by name.
_Sources: `src/lifebar/document.ts`, `src/lifebar/parse.ts`_
