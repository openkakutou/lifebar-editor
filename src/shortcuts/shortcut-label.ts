// Surfaces an action's live keyboard shortcut on its own trigger button
// (backlog item 008): a shortcut nobody can discover barely counts as one,
// especially in this app's case (a brand-new, greenfield addition with no
// existing user expectation to lean on) -- see
// .vibe/decisions/008-remappable-shortcuts-scope-input-guard-and-discoverability.md.
// Kept as a small standalone module rather than folded into save-export.ts/
// undo-redo-controls.ts, so those stay unaware of the shortcut manager
// entirely -- this binds an already-rendered element from the outside.
import type { ShortcutManager } from "@openkakutou/web-ui-kit";

export function formatShortcutTitle(
  baseLabel: string,
  key: string | undefined,
): string {
  return key === undefined ? baseLabel : `${baseLabel} (${key})`;
}

/**
 * Sets `element`'s `title` (a visible tooltip) and `aria-keyshortcuts` (the
 * same information for assistive tech) to `actionId`'s current binding on
 * `manager`, and keeps them live as the user rebinds it. An unregistered
 * `actionId` just shows `baseLabel` on its own, with no shortcut attribute.
 *
 * Returns an unsubscribe function: `manager` is typically a long-lived
 * singleton (`app-shortcut-manager.ts`) outliving any one render of
 * `element`, so a caller that can re-render (e.g. `main.ts`'s `renderApp`)
 * must call it before binding a fresh element, or the manager accumulates a
 * listener per render that keeps stale, detached elements reachable.
 */
export function bindShortcutLabel(
  element: HTMLElement,
  manager: ShortcutManager,
  actionId: string,
  baseLabel: string,
): () => void {
  function apply(): void {
    const key = manager.getBinding(actionId);
    element.title = formatShortcutTitle(baseLabel, key);
    if (key === undefined) {
      element.removeAttribute("aria-keyshortcuts");
    } else {
      element.setAttribute("aria-keyshortcuts", key);
    }
  }

  function handleChange(event: Event): void {
    if ((event as CustomEvent<{ id: string }>).detail.id === actionId) {
      apply();
    }
  }

  apply();
  manager.addEventListener("change", handleChange);
  return () => manager.removeEventListener("change", handleChange);
}
