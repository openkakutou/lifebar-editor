---
date: 2026-09-06
status: accepted
---
# Remappable shortcuts: which actions, the text-field input guard, and default discoverability

**Context:** Item 008 adopts `web-ui-kit`'s `ShortcutManager`/`<wuik-shortcuts-panel>` for this app's actions. The brief names "save/export, undo/redo, add/remove element, etc." as examples, but this app has no add/remove-element action yet. Two points needed a call: whether Undo/Redo's keyboard shortcut should fire while the user is typing in a text field, and whether the new shortcuts panel starts expanded or collapsed.

**Decision:** Register exactly the three actions that actually exist today (Save/Export, Undo, Redo) with default bindings Ctrl+S, Ctrl+Z, Ctrl+Y. Save/Export's shortcut always fires and always calls `preventDefault()`, regardless of where focus is — its only native conflict is the browser's own "Save Page" dialog, which must always be suppressed. Undo/Redo's shortcut is suppressed whenever focus is inside a text input, textarea, or contenteditable element, so the browser's native per-field undo/redo isn't hijacked by the app-level document history; leaving the field restores the app-level shortcut. The new "Keyboard Shortcuts" section starts expanded by default (unlike this app's other collapsible sections, which start collapsed) since this is the sole place a brand-new, otherwise-invisible capability can be discovered.

**Reason:** Inventing an action for a feature ("add/remove element") that doesn't exist yet would register a shortcut for nothing reachable, failing the "no action reachable only through a hardcoded key handler" spirit in the other direction (a shortcut reachable through nothing at all). The input-guard split follows straight from what each shortcut's key actually conflicts with: Ctrl+S has no in-field meaning of its own, while Ctrl+Z/Ctrl+Y are exactly the browser's own text-field undo/redo keys. Defaulting the panel open trades a small amount of visual weight for actually surfacing a feature nobody has a reason to go looking for yet.

**Rejected alternatives:**
- *Register a placeholder "add/remove element" action now*: rejected — there is no code path it would call; a shortcut bound to nothing is worse than no shortcut.
- *Suppress Undo/Redo everywhere a document exists, including text fields*: rejected — silently eating a user's in-progress text-field undo to fire an unrelated document-level undo is a worse surprise than the shortcut occasionally deferring to the field.
- *Start the shortcuts panel collapsed, like other sections*: rejected — a collapsed-by-default panel is exactly how a first-time capability stays undiscovered; this section is the single discovery path for the entire feature.
