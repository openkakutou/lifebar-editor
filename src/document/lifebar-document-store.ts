// The in-memory representation of the currently loaded lifebar file: the
// parsed document plus the file name it came from. The single place later
// editor screens (the elements/sprite-assignment editor, item 004; save/
// export, item 005) read from — the form backlog item 002's last
// acceptance criterion ("exposed in a form...can consume") means in code.
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

/** The currently loaded lifebar file, or `null` before any file loads successfully. */
export function getLifebarDocument(): LifebarEditorDocument | null {
  return current;
}

/** Replaces the currently loaded lifebar document. Pass `null` to clear it. */
export function setLifebarDocument(doc: LifebarEditorDocument | null): void {
  current = doc;
}

/** Resets the in-memory document to its initial (unloaded) state. Test-only. */
export function resetLifebarDocumentForTests(): void {
  current = null;
}
