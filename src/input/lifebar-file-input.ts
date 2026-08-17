// Pure, DOM-free logic for the single-file lifebar input: reads the file
// as text and parses it via ./lifebar/parse.ts. Unlike character-editor's
// accumulating multi-slot file input, there is only ever one file to
// gather here — see .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md.
import type { LifebarDocument } from "../lifebar/document.ts";
import { parseLifebar } from "../lifebar/parse.ts";

export type LifebarInputResult =
  | { status: "success"; fileName: string; document: LifebarDocument }
  | { status: "read-error"; message: string }
  | { status: "parse-error"; message: string };

/**
 * Reads a File's text via `FileReader` rather than `Blob#text()` — the
 * pinned jsdom version's `Blob` implementation is incomplete (the same
 * real-browser/jsdom parity concern `character-editor`'s file input
 * documents for `Blob#arrayBuffer()`), so `FileReader` is used everywhere
 * in this org for the same reason.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("FileReader did not return text"));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("failed to read file"));
    };
    reader.readAsText(file);
  });
}

export interface LifebarFileInputOptions {
  /** Reads a File's text content. Defaults to `readFileAsText`; injectable for testing failure paths. */
  readFileText?: (file: File) => Promise<string>;
}

/**
 * Reads `file` as text and parses it into a `LifebarDocument`, returning a
 * typed result instead of throwing on an unreadable file or malformed
 * content.
 */
export async function loadLifebarFromFile(
  file: File,
  options: LifebarFileInputOptions = {},
): Promise<LifebarInputResult> {
  const readFileText = options.readFileText ?? readFileAsText;

  let text: string;
  try {
    text = await readFileText(file);
  } catch (err) {
    return {
      status: "read-error",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const parsed = parseLifebar(text);
  if (parsed.status === "error") {
    return { status: "parse-error", message: parsed.message };
  }
  return { status: "success", fileName: file.name, document: parsed.document };
}
