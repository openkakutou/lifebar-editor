---
status: done
depends_on: [001]
---
# Adopt Undo/Redo Command-Stack from web-ui-kit

## Description
Wire this app's editing operations (elements editor and sprite assignment from item 004) through the shared undo/redo command-stack primitive provided by `web-ui-kit`, instead of leaving edits non-reversible. Each mutating action should push a do/undo pair onto the shared history rather than inventing local history handling.

## Acceptance Criteria
- [x] Every mutating action available in the elements editor (item 004) is undoable and redoable
- [x] Undo/redo is reachable via an explicit UI control (toolbar buttons) — the shared shortcut manager path is deferred until item 008 lands (see Notes)
- [x] Undo/redo state (available/not available) is visibly reflected in the UI (disabled toolbar controls at the ends of the history)

## Notes
Cross-repo blocker resolved: `web-ui-kit`'s `CommandStack` primitive (its own item `009`) and this repo's item `001` (adopting `web-ui-kit`) were both `status: done` by the time this item was picked up.

Keyboard-shortcut reachability (the acceptance criterion's other half) is deferred: this app has no shortcut manager yet (item 008, still `status: todo`). Shipping the toolbar-control path now rather than blocking on that dependency was a deliberate call — see `.vibe/decisions/007-undo-redo-scoped-to-current-document-shortcut-deferred.md`. Item 008, once implemented, should register Undo/Redo as shortcut actions against the same shared `commandStack`.
