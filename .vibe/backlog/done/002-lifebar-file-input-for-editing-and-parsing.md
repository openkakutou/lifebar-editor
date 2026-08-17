---
status: done
depends_on: [001]
---
# Lifebar File Input For Editing & Parsing

## Description
Since this is a static site with no backend, the user must supply an existing lifebar `.def`-style file directly from their machine (or start from nothing, deferred to item 006). Add a file input (standard file picker and/or drag-and-drop) that lets the user select or drop the lifebar file, reads it as text, and feeds it into this app's own internal parser — a fresh implementation, separate from `lifebar-viewer-web`'s parser, per roadmap `.vibe/decisions/002` and `009`. The parser targets MUGEN 1.0/1.1 and Ikemen GO compatibility, validated against real community lifebar files, and produces the in-memory data model the rest of the editor (elements editor, save/export) will build on.

## Acceptance Criteria
- [ ] User can select a lifebar file via a file picker, or drag-and-drop it onto a drop zone
- [ ] The selected file is read as text and parsed into an in-memory lifebar data model (element positions, fonts, sprite references, sections)
- [ ] Parsing an Ikemen GO-specific lifebar file (not just plain MUGEN 1.0/1.1) succeeds and preserves its extensions
- [ ] A malformed or unrecognized file shows a clear error state naming what failed to parse, instead of crashing the page or silently producing an empty model
- [ ] Parsed data is exposed in a form the elements editor (item 004) and save/export (item 005) can consume

## Notes
None.
