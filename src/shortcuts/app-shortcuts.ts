// This app's keyboard shortcuts (backlog item 008): registers its three
// user-triggerable actions -- Save/Export, Undo, Redo -- with `web-ui-kit`'s
// shared, headless `ShortcutManager` instead of hardcoding key handlers, and
// dispatches a real `keydown` event to whichever action currently owns its
// combo. There is no "add/remove element" action here (yet): the backlog
// item's own wording is illustrative, not a feature this app has -- see
// .vibe/decisions/008-remappable-shortcuts-scope-input-guard-and-discoverability.md.
//
// `ShortcutManager` itself only tracks bindings; it does not listen for
// `keydown` or normalize a `KeyboardEvent` into a combo string -- that glue
// lives in `web-ui-kit`'s own (unexported) `shortcut-key.ts`, used
// internally by its `<wuik-shortcuts-panel>`. Since it isn't part of that
// package's public API, `normalizeKeyCombo` below is a local port of the
// same rule (modifier order Ctrl, Meta, Alt, Shift; a single-character key
// uppercased) so a live keypress matches the exact combo strings the manager
// stores.
import type { ShortcutAction, ShortcutManager } from "@openkakutou/web-ui-kit";

export const APP_SHORTCUT_ACTIONS: readonly ShortcutAction[] = [
  { id: "save-export", label: "Save / Export", defaultKey: "Ctrl+S" },
  { id: "undo", label: "Undo", defaultKey: "Ctrl+Z" },
  { id: "redo", label: "Redo", defaultKey: "Ctrl+Y" },
];

export interface AppShortcutHandlers {
  onSaveExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

/** Registers every one of this app's actions on `manager` with its default binding. */
export function registerAppShortcuts(manager: ShortcutManager): void {
  for (const action of APP_SHORTCUT_ACTIONS) {
    manager.register(action);
  }
}

/**
 * True when `target` is an element a keystroke would normally edit text in
 * (a text input, textarea, or contenteditable region) -- used to defer a
 * shortcut whose key the browser's own in-field editing already claims
 * (Undo/Redo), rather than hijacking it.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  // `Element.isContentEditable` is unimplemented in this project's pinned
  // jsdom (always `undefined`, even with the attribute set) -- the same
  // real-browser/jsdom parity gap already documented for `Blob` elsewhere in
  // this app. Checking the attribute directly (inheriting through ancestors
  // via `closest`, since contenteditable is an inherited state) works
  // identically in both, so it's used instead of the property getter.
  return (
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

const MODIFIER_KEY_NAMES = new Set(["Shift", "Control", "Alt", "Meta"]);

interface ComboSourceEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** See this module's top comment for why this mirrors, rather than imports, `web-ui-kit`'s own normalization. */
function normalizeKeyCombo(event: ComboSourceEvent): string | undefined {
  if (MODIFIER_KEY_NAMES.has(event.key)) {
    return undefined;
  }

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.metaKey) parts.push("Meta");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(key);
  return parts.join("+");
}

/** Finds which registered action (if any) currently owns the combo `event` represents -- the *live* binding, default or user-rebound. */
export function resolveAppShortcutActionId(
  manager: ShortcutManager,
  event: ComboSourceEvent,
): string | undefined {
  const combo = normalizeKeyCombo(event);
  if (combo === undefined) {
    return undefined;
  }
  return manager.list().find((binding) => binding.key === combo)?.id;
}

/**
 * Dispatches a real `keydown` event to whichever action's current binding
 * matches, calling the matching `handlers` callback and preventing the
 * browser's own default for that key. Returns whether it handled the event,
 * for callers/tests that want to tell a real dispatch apart from a no-op.
 *
 * Undo/Redo defer to the field when `event.target` is editable (native
 * text-field undo/redo keeps working); Save/Export always fires and always
 * prevents the browser's own "Save Page" dialog, since it has no in-field
 * meaning of its own to conflict with. See .vibe/decisions/008-....md.
 */
export function handleAppShortcutKeydown(
  event: KeyboardEvent,
  manager: ShortcutManager,
  handlers: AppShortcutHandlers,
): boolean {
  const actionId = resolveAppShortcutActionId(manager, event);
  if (actionId === undefined) {
    return false;
  }

  if (
    (actionId === "undo" || actionId === "redo") &&
    isEditableTarget(event.target)
  ) {
    return false;
  }

  switch (actionId) {
    case "save-export":
      event.preventDefault();
      handlers.onSaveExport();
      return true;
    case "undo":
      event.preventDefault();
      handlers.onUndo();
      return true;
    case "redo":
      event.preventDefault();
      handlers.onRedo();
      return true;
    default:
      return false;
  }
}
