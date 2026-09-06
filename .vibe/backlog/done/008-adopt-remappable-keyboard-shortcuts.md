---
status: done
depends_on: [001]
---
# Adopt Remappable Keyboard Shortcuts from web-ui-kit

## Description
Register this app's actions (save/export, undo/redo, add/remove element, etc.) with the shared keyboard-shortcut manager provided by `web-ui-kit`, instead of hardcoding key bindings, so users get a consistent, rebindable shortcut experience across every OpenKakutou editor. Motivated by a recurring Fighter Factory Ultimate complaint that shortcuts (e.g. Ctrl+S) could not be remapped.

## Acceptance Criteria
- [x] This app's key actions are registered with default bindings through the shared shortcut manager
- [x] A user can rebind any of this app's registered shortcuts via the shared shortcuts panel and have it persist across reloads
- [x] No action in this app is reachable only through a hardcoded, non-remappable key handler

## Notes
Cross-repo blocker resolved: `web-ui-kit`'s own shortcut manager (its item 010) and this repo's item 001 (adopting `web-ui-kit`) were both `status: done` by the time this item was picked up.

Registered actions: Save/Export, Undo, Redo — the only three this app actually has today. "Add/remove element" (mentioned in the description) isn't a real action yet, so nothing was registered for it; a future item adding it should register it here too. This also resolves item 007's own deferred note: Undo/Redo are now reachable via keyboard shortcut, not just the toolbar buttons. See `.vibe/decisions/008-remappable-shortcuts-scope-input-guard-and-discoverability.md`.
