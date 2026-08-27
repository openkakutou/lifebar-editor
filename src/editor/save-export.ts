// Save/export (backlog item 005): serializes the currently loaded lifebar
// (as edited in place by elements-editor.ts -- same document store object
// reference, no re-parse needed) back to `.def`-style text, and triggers a
// browser download of the result. Gated by export-validation.ts's two-tier
// check: a "blocking" problem (data that would silently corrupt on reload)
// stops the export outright; a "warning" problem (an unverified/invalid
// sprite reference, otherwise harmless to the exported text) is shown with
// an explicit "Export anyway" action instead of trapping the user's
// in-progress work. See
// .vibe/decisions/005-save-export-round-trip-and-validation-gate.md.
import {
  type LifebarEditorDocument,
  getLifebarDocument as defaultGetLifebarDocument,
} from "../document/lifebar-document-store.ts";
import {
  type SffSpriteSheetDocument,
  getSffSpriteSheet as defaultGetSffSpriteSheet,
} from "../document/sff-sprite-sheet-store.ts";
import { serializeLifebar as defaultSerializeLifebar } from "../lifebar/serialize.ts";
import {
  type ExportProblem,
  findExportProblems as defaultFindExportProblems,
} from "./export-validation.ts";

/** Triggers a browser download of `text` as `fileName` via a throwaway
 * object URL. Same shape as the sibling `stage-editor`/`character-editor`
 * apps' own save/export download trigger, adapted to plain text (this
 * app's own lifebar parser/serializer works with text, never WASM bytes). */
export function defaultTriggerDownload(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export interface SaveExportOptions {
  /** Reads the currently loaded lifebar document. Defaults to the real document store; injectable for testing. */
  getLifebarDocument?: () => LifebarEditorDocument | null;
  /** Reads the currently loaded sprite sheet. Defaults to the real document store; injectable for testing. */
  getSffSpriteSheet?: () => SffSpriteSheetDocument | null;
  /** Serializes the document to `.def`-style text. Defaults to the real serializer; injectable for testing. */
  serializeLifebar?: typeof defaultSerializeLifebar;
  /** Finds export problems in the document. Defaults to the real check; injectable for testing. */
  findExportProblems?: typeof defaultFindExportProblems;
  /** Triggers the browser download. Defaults to the real object-URL download; injectable for testing. */
  triggerDownload?: (text: string, fileName: string) => void;
}

function formatProblems(problems: ExportProblem[]): string {
  return problems.map((p) => `${p.sectionName}: ${p.message}`).join(" ");
}

/** Renders a "Save / Export" button into `root`. Reads the currently
 * loaded document fresh on every click (rather than a stale snapshot),
 * matching the document store's own "single place editor screens read
 * from and write back to" role. */
export function renderSaveExport(
  root: HTMLElement,
  options: SaveExportOptions = {},
): void {
  root.replaceChildren();

  const getLifebarDocument =
    options.getLifebarDocument ?? defaultGetLifebarDocument;
  const getSffSpriteSheet =
    options.getSffSpriteSheet ?? defaultGetSffSpriteSheet;
  const serializeLifebar = options.serializeLifebar ?? defaultSerializeLifebar;
  const findExportProblems =
    options.findExportProblems ?? defaultFindExportProblems;
  const triggerDownload = options.triggerDownload ?? defaultTriggerDownload;

  const button = document.createElement("wuik-button");
  button.dataset.action = "save-export";
  button.textContent = "Save / Export";

  const status = document.createElement("p");
  status.className = "save-export__status";
  status.setAttribute("role", "status");

  let exportAnywayButton: HTMLElement | null = null;

  const doExport = (doc: LifebarEditorDocument): void => {
    const text = serializeLifebar(doc.document);
    triggerDownload(text, doc.fileName);
    status.textContent = `Saved ${doc.fileName}.`;
    exportAnywayButton?.remove();
    exportAnywayButton = null;
  };

  button.addEventListener("click", () => {
    exportAnywayButton?.remove();
    exportAnywayButton = null;

    const doc = getLifebarDocument();
    if (doc === null) return;

    const spriteGroups = getSffSpriteSheet()?.spriteGroups ?? null;
    const problems = findExportProblems(doc.document, spriteGroups);
    const blocking = problems.filter((p) => p.severity === "blocking");
    const warnings = problems.filter((p) => p.severity === "warning");

    if (blocking.length > 0) {
      status.textContent = formatProblems(blocking);
      return;
    }

    if (warnings.length > 0) {
      status.textContent = formatProblems(warnings);

      const anyway = document.createElement("wuik-button");
      anyway.setAttribute("variant", "secondary");
      anyway.dataset.action = "export-anyway";
      anyway.textContent = "Export anyway";
      anyway.addEventListener("click", () => doExport(doc));
      exportAnywayButton = anyway;
      root.appendChild(anyway);
      return;
    }

    doExport(doc);
  });

  root.append(button, status);
}
