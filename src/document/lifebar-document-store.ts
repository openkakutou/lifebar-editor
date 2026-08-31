// The in-memory representation of the currently loaded lifebar file: the
// parsed document plus the file name it came from. The single place later
// editor screens (the elements/sprite-assignment editor, item 004; save/
// export, item 005; the New Lifebar Wizard, item 006) read from — the form
// backlog item 002's last acceptance criterion ("exposed in a form...can
// consume") means in code.
//
// A plain module-level variable with a test-only reset, the same shape
// `character-editor`'s own `character-document.ts` already established for
// the same kind of in-process, no-external-effect state.
import type { LifebarDocument } from "../lifebar/document.ts";

export interface LifebarEditorDocument {
  fileName: string;
  document: LifebarDocument;
}

let current: LifebarEditorDocument | null = null;
// A snapshot of `current.document`, taken whenever it was last known
// "clean" (just loaded, just created by the New Lifebar Wizard, or just
// saved) — see backlog item 006 and
// .vibe/decisions/006-new-lifebar-wizard-defaults-and-unsaved-changes-guard.md.
// Comparing against a snapshot (rather than a boolean flipped by
// elements-editor.ts's own onEntryChange callback) means only an actual
// value difference counts as "unsaved" — a no-op edit, or one reverted
// back to its original value, never flags the document dirty.
let cleanSnapshot: string | null = null;

/** The currently loaded lifebar file, or `null` before any file loads successfully. */
export function getLifebarDocument(): LifebarEditorDocument | null {
  return current;
}

/** Replaces the currently loaded lifebar document. Pass `null` to clear it. */
export function setLifebarDocument(doc: LifebarEditorDocument | null): void {
  current = doc;
  cleanSnapshot = doc ? JSON.stringify(doc.document) : null;
}

/**
 * Records the currently loaded lifebar's present state as "saved" — call
 * after a successful save/export so `hasUnsavedLifebarChanges` reports
 * clean again, without needing to reload or replace the document.
 */
export function markLifebarDocumentSaved(): void {
  cleanSnapshot = current ? JSON.stringify(current.document) : null;
}

/**
 * Whether the currently loaded lifebar has been edited since it was last
 * loaded, created, or saved. `false` when nothing is loaded — there is
 * nothing to lose by starting fresh.
 */
export function hasUnsavedLifebarChanges(): boolean {
  if (current === null) return false;
  return JSON.stringify(current.document) !== cleanSnapshot;
}

/** Resets the in-memory document to its initial (unloaded) state. Test-only. */
export function resetLifebarDocumentForTests(): void {
  current = null;
  cleanSnapshot = null;
}
