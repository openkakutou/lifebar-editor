---
status: todo
depends_on: [001]
---
# Adopt Undo/Redo Command-Stack from web-ui-kit

## Description
Wire this app's editing operations (elements editor and sprite assignment from item 004) through the shared undo/redo command-stack primitive provided by `web-ui-kit`, instead of leaving edits non-reversible. Each mutating action should push a do/undo pair onto the shared history rather than inventing local history handling.

## Acceptance Criteria
- [ ] Every mutating action available in the elements editor (item 004) is undoable and redoable
- [ ] Undo/redo is reachable both via the shared shortcut manager (item 008) and via an explicit UI control (e.g. toolbar buttons)
- [ ] Undo/redo state (available/not available) is visibly reflected in the UI (e.g. disabled controls at the ends of the history)

## Notes
Cross-repo blocker: depends on `web-ui-kit`'s own primitive being implemented first — `web-ui-kit`'s `.vibe/backlog/009-undo-redo-command-stack-primitive.md`, currently `status: todo`. Also depends on this repo's item 001 (adopting `web-ui-kit` at all), currently `status: todo`.
