// Combines candidate detection (which gathered file is the lifebar's own
// `.def`-style file) with reading and parsing it via ../lifebar/parse.ts —
// see backlog item 011 for why folder selection is now the only way to
// reach a lifebar file on this app's web build. Mirrors
// `lifebar-viewer-web`'s own `src/input/lifebar-folder-input.ts` (same
// domain, same candidate-resolution shape), minus that app's `warnings`
// field — this app's own `parseLifebar` (see
// .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md) retains
// every section rather than skipping unrecognized ones, so it has nothing
// to warn about.
import type { LifebarDocument } from "../lifebar/document.ts";
import { parseLifebar } from "../lifebar/parse.ts";
import type { GatheredFile } from "./folder-entries.ts";

export type CandidateResolution =
  | { status: "no-files" }
  | { status: "no-candidate" }
  | { status: "success"; entry: GatheredFile }
  | { status: "needs-selection"; candidates: GatheredFile[] };

function isCandidateLifebarFile(gathered: GatheredFile): boolean {
  return gathered.file.name.toLowerCase().endsWith(".def");
}

/**
 * Decides what to do with the files gathered from a folder selection: none
 * gathered at all, none matching the `.def` heuristic, exactly one match
 * (auto-load), or several (the caller must ask the user to pick one).
 */
export function resolveCandidates(
  files: readonly GatheredFile[],
): CandidateResolution {
  if (files.length === 0) {
    return { status: "no-files" };
  }
  const candidates = files.filter(isCandidateLifebarFile);
  if (candidates.length === 0) {
    return { status: "no-candidate" };
  }
  if (candidates.length === 1) {
    return { status: "success", entry: candidates[0] };
  }
  return { status: "needs-selection", candidates };
}

export type LifebarFolderInputResult =
  | {
      status: "success";
      fileName: string;
      relativePath: string;
      document: LifebarDocument;
    }
  | { status: "no-files" }
  | { status: "no-candidate" }
  | { status: "needs-selection"; candidates: GatheredFile[] }
  | { status: "read-error"; fileName: string; message: string }
  | { status: "parse-error"; fileName: string; message: string };

/**
 * Reads a File's text via `FileReader` rather than `Blob#text()` — the
 * pinned jsdom version's `Blob` implementation is incomplete, the same
 * real-browser/jsdom parity reason every other OpenKakutou app's file
 * input uses `FileReader` instead.
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

export interface LifebarFolderInputOptions {
  /** Reads a File's text content. Defaults to `readFileAsText`; injectable for testing. */
  readFileText?: (file: File) => Promise<string>;
}

/** Reads and parses a single already-chosen candidate entry. */
export async function loadLifebarFromChosenEntry(
  entry: GatheredFile,
  options: LifebarFolderInputOptions = {},
): Promise<LifebarFolderInputResult> {
  const readFileText = options.readFileText ?? readFileAsText;
  const fileName = entry.file.name;

  let text: string;
  try {
    text = await readFileText(entry.file);
  } catch (err) {
    return {
      status: "read-error",
      fileName,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const parsed = parseLifebar(text);
  if (parsed.status === "error") {
    return { status: "parse-error", fileName, message: parsed.message };
  }
  return {
    status: "success",
    fileName,
    relativePath: entry.relativePath,
    document: parsed.document,
  };
}

/**
 * Resolves which candidate to use among the files gathered from a folder
 * selection, then — only once a single candidate is settled — reads and
 * parses it. `no-files`/`no-candidate`/`needs-selection` short-circuit
 * without reading anything.
 */
export async function loadLifebarFromFolderFiles(
  files: readonly GatheredFile[],
  options: LifebarFolderInputOptions = {},
): Promise<LifebarFolderInputResult> {
  const resolution = resolveCandidates(files);
  if (resolution.status !== "success") {
    return resolution;
  }
  return loadLifebarFromChosenEntry(resolution.entry, options);
}
