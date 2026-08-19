// Pure, DOM-free logic for the single-file sprite sheet input: reads the
// file's bytes and loads it via the `sff` WASM bridge, returning a typed
// result that distinguishes three different failure causes instead of a
// single generic error (backlog item 003's own acceptance criteria):
// reading the file failed, bringing up the WASM module itself failed (a
// missing/not-yet-downloaded build), or the module ran and reported the
// file itself is malformed. Single-slot, wholesale-replace — same
// interaction model as this app's own lifebar file input
// (.vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md).
import {
  type SpriteSheetResult,
  type WasmBridgeOptions,
  loadSpriteSheet as defaultLoadSpriteSheet,
} from "../wasm/bridge.ts";
import type { SpriteGroup } from "../wasm/types.ts";

export type SpriteSheetInputResult =
  | {
      status: "success";
      fileName: string;
      sffBytes: Uint8Array;
      spriteGroups: SpriteGroup[];
    }
  | { status: "read-error"; fileName: string; message: string }
  | { status: "setup-error"; fileName: string; message: string }
  | { status: "parse-error"; fileName: string; message: string };

/**
 * Reads a File's bytes via `FileReader` rather than `Blob#arrayBuffer()` —
 * the pinned jsdom version's `Blob` implementation is incomplete, the same
 * real-browser/jsdom parity reason every other OpenKakutou app's file
 * input uses `FileReader` instead.
 */
export function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        reject(new Error("FileReader did not return an ArrayBuffer"));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("failed to read file"));
    };
    reader.readAsArrayBuffer(file);
  });
}

export interface SpriteSheetInputOptions {
  /** Reads a File's bytes. Defaults to `readFileAsBytes`; injectable for testing. */
  readFileBytes?: (file: File) => Promise<Uint8Array>;
  /** Loads a sprite sheet via the WASM bridge. Defaults to the real bridge; injectable for testing. */
  loadSpriteSheet?: (
    sffBytes: Uint8Array,
    options?: WasmBridgeOptions,
  ) => Promise<SpriteSheetResult>;
  /** Forwarded to the default loadSpriteSheet; ignored if loadSpriteSheet is overridden. */
  bridgeOptions?: WasmBridgeOptions;
}

/**
 * Reads `file`'s bytes and loads it as a sprite sheet via the `sff` WASM
 * bridge. `loadSpriteSheet` itself only ever resolves (never throws) for a
 * WASM-reported error — it *rejects* if bringing the module up in the
 * first place fails (see bridge.ts's own doc comment), which is what lets
 * this function tell the two failure causes apart.
 */
export async function loadSpriteSheetFromFile(
  file: File,
  options: SpriteSheetInputOptions = {},
): Promise<SpriteSheetInputResult> {
  const readFileBytes = options.readFileBytes ?? readFileAsBytes;
  const loadSpriteSheet = options.loadSpriteSheet ?? defaultLoadSpriteSheet;
  const fileName = file.name;

  let sffBytes: Uint8Array;
  try {
    sffBytes = await readFileBytes(file);
  } catch (err) {
    return {
      status: "read-error",
      fileName,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  let result: SpriteSheetResult;
  try {
    result = await loadSpriteSheet(sffBytes, options.bridgeOptions);
  } catch (err) {
    return {
      status: "setup-error",
      fileName,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  if (!result.ok) {
    return { status: "parse-error", fileName, message: result.error };
  }
  return {
    status: "success",
    fileName,
    sffBytes,
    spriteGroups: result.spriteGroups,
  };
}
