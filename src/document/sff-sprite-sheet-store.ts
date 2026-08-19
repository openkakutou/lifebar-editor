// The in-memory representation of the currently loaded `.sff` sprite
// sheet: its file name, raw bytes (needed for later on-demand pixel
// decodes when assigning sprites to elements), and decoded metadata. The
// form the elements editor (item 004) reads from to assign sprites to
// lifebar elements. A plain module-level variable with a test-only reset,
// mirroring `lifebar-document-store.ts`'s own shape for the same kind of
// in-process, no-external-effect state.
import type { SpriteGroup } from "../wasm/types.ts";

export interface SffSpriteSheetDocument {
  fileName: string;
  sffBytes: Uint8Array;
  spriteGroups: SpriteGroup[];
}

let current: SffSpriteSheetDocument | null = null;

/** The currently loaded sprite sheet, or `null` before any file loads successfully. */
export function getSffSpriteSheet(): SffSpriteSheetDocument | null {
  return current;
}

/** Replaces the currently loaded sprite sheet. Pass `null` to clear it. */
export function setSffSpriteSheet(doc: SffSpriteSheetDocument | null): void {
  current = doc;
}

/** Resets the in-memory sprite sheet to its initial (unloaded) state. Test-only. */
export function resetSffSpriteSheetForTests(): void {
  current = null;
}
