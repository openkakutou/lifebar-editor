---
date: 2026-09-03
status: accepted
---
# Undo/redo history is scoped to the current document; shortcut reachability deferred

**Context:** Item 007 wires the elements editor's edits through `web-ui-kit`'s shared `CommandStack`. Two points weren't fully specified: what happens to the history when the loaded document is replaced (a new file loaded, or the New Lifebar Wizard creates one), and how to satisfy the acceptance criterion that undo/redo be reachable both via a toolbar control and via the shared shortcut manager — this app has no shortcut manager yet (item 008, still `status: todo`).

**Decision:** The shared command stack is cleared (`commandStack.clear()`) whenever a document is loaded or created, before the new document is stored. Undo/redo only ever applies to edits made on the currently loaded document — there is no "undo past a document swap." Separately, only the explicit toolbar-button reachability path ships now; the keyboard-shortcut path is left for item 008 to wire up once this app adopts `web-ui-kit`'s shortcut manager, rather than blocking this item on a dependency it doesn't formally declare.

**Reason:** An undo step that silently reapplies an edit from a document no longer loaded would corrupt the new one — every other piece of per-document state in this app (the sprite sheet's palette assumptions, the unsaved-changes snapshot) already resets on a document swap for the same reason. Blocking item 007 entirely on item 008 landing first would leave the whole feature undelivered for a UI-control need that's fully satisfiable today; the shortcut path is additive; it doesn't change the toolbar path's own contract once added.

**Rejected alternatives:**
- *Keep history across a document swap*: rejected — an undo/redo entry closes over a specific document's section/entry indices; replaying it against a different document is meaningless at best, silently wrong at worst.
- *Block this item until item 008 ships*: rejected — item 008 is unstarted and unrelated in scope (a general shortcut manager, not specific to undo/redo); the toolbar-control acceptance criterion doesn't need it.
