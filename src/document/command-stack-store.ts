// The shared undo/redo history for this app's editing operations (backlog
// item 007), wired through `web-ui-kit`'s own `CommandStack` primitive
// rather than a bespoke local implementation. A single module-level
// instance -- same "plain get/set-shaped singleton with a test-only reset"
// pattern as `lifebar-document-store.ts`/`sff-sprite-sheet-store.ts` --
// since every screen that can push an undoable edit (currently the
// elements editor) shares one history, not one per screen.
import { CommandStack } from "@openkakutou/web-ui-kit";

export const commandStack = new CommandStack();

/** Empties the shared undo/redo history. Test-only. */
export function resetCommandStackForTests(): void {
  commandStack.clear();
}
