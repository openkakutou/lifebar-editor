// DOM component for backlog item 002 (lifebar file input): a single-file
// picker plus a drag-and-drop zone, wholesale-replacing the previous
// outcome on every new drop — see
// .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md for why
// this is a single-slot model, unlike character-editor's accumulating
// multi-slot file input.
import { onLocaleChange, t } from "../i18n/i18n.ts";
import type { LifebarDocument } from "../lifebar/document.ts";
import {
  type LifebarFileInputOptions,
  loadLifebarFromFile,
} from "./lifebar-file-input.ts";

export interface LifebarFileInputViewOptions {
  /** Called once a file has been read and parsed successfully. */
  onLoaded: (document: LifebarDocument, fileName: string) => void;
  /** Forwarded to the file-reading layer; injectable for testing. */
  fileOptions?: LifebarFileInputOptions;
}

/**
 * What the status line currently shows -- a small tagged description of the
 * situation and its raw parameters, not pre-formatted text. Kept as data
 * (not a string) so a locale change can re-format it in the new language
 * without re-reading/re-parsing the file that produced it. See
 * .vibe/decisions/009-i18n-integration-approach.md.
 */
type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "success"; fileName: string; sectionCount: number }
  | { kind: "read-error"; fileName: string; message: string }
  | { kind: "parse-error"; fileName: string; message: string };

function formatStatus(status: Status): string {
  switch (status.kind) {
    case "idle":
      return "";
    case "reading":
      return t("input.lifebar.reading", "Reading…");
    case "success":
      return t(
        "input.lifebar.success",
        "Loaded {{fileName}} — {{count}} section(s) found.",
        {
          fileName: status.fileName,
          count: String(status.sectionCount),
        },
      );
    case "read-error":
      return t(
        "input.lifebar.errorRead",
        "Could not read {{fileName}}: {{message}}",
        {
          fileName: status.fileName,
          message: status.message,
        },
      );
    case "parse-error":
      return t(
        "input.lifebar.errorParse",
        "Could not parse {{fileName}}: {{message}}",
        {
          fileName: status.fileName,
          message: status.message,
        },
      );
  }
}

/**
 * Renders the lifebar file input into `root`, replacing its previous
 * content. The native file input stays a first-class, fully keyboard- and
 * screen-reader-operable control alongside the drag-and-drop zone.
 */
export function renderLifebarFileInput(
  root: HTMLElement,
  options: LifebarFileInputViewOptions,
): void {
  root.replaceChildren();

  let phase: "idle" | "loading" | "success" | "error" = "idle";
  let status: Status = { kind: "idle" };

  const panel = document.createElement("wuik-panel");
  panel.className = "lifebar-input";

  const dropZone = document.createElement("div");
  dropZone.className = "lifebar-input__dropzone";

  const label = document.createElement("label");
  label.className = "lifebar-input__label";
  label.htmlFor = "lifebar-file-picker";

  const picker = document.createElement("input");
  picker.type = "file";
  picker.id = "lifebar-file-picker";
  picker.accept = ".def";

  const hint = document.createElement("p");
  hint.className = "lifebar-input__hint";

  dropZone.append(label, picker, hint);

  const statusEl = document.createElement("div");
  statusEl.className = "lifebar-input__status";
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");

  panel.append(dropZone, statusEl);
  root.appendChild(panel);

  function renderStaticText(): void {
    label.textContent = t(
      "input.lifebar.label",
      "Select the lifebar file (e.g. fight.def)",
    );
    hint.textContent = t("input.lifebar.dropHint", "…or drag and drop it here");
  }

  function render(): void {
    dropZone.classList.toggle(
      "lifebar-input__dropzone--loading",
      phase === "loading",
    );
    picker.disabled = phase === "loading";
    statusEl.classList.toggle(
      "lifebar-input__status--error",
      phase === "error",
    );
    statusEl.textContent = formatStatus(status);
  }

  async function handleFile(file: File): Promise<void> {
    phase = "loading";
    status = { kind: "reading" };
    render();

    const result = await loadLifebarFromFile(file, options.fileOptions);

    if (result.status === "success") {
      phase = "success";
      status = {
        kind: "success",
        fileName: result.fileName,
        sectionCount: result.document.sections.length,
      };
      render();
      options.onLoaded(result.document, result.fileName);
      return;
    }

    phase = "error";
    status =
      result.status === "read-error"
        ? { kind: "read-error", fileName: file.name, message: result.message }
        : { kind: "parse-error", fileName: file.name, message: result.message };
    render();
  }

  picker.addEventListener("change", () => {
    const file = picker.files?.[0];
    picker.value = "";
    if (file) void handleFile(file);
  });

  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropZone.classList.add("lifebar-input__dropzone--dragging");
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("lifebar-input__dropzone--dragging");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("lifebar-input__dropzone--dragging");
    const file = (event as DragEvent).dataTransfer?.files?.[0];
    if (file) void handleFile(file);
  });

  // This view is only ever mounted once per app session (see main.ts's
  // renderApp) -- one subscription for its whole lifetime never
  // accumulates. Re-formats whatever is currently shown (the static
  // chrome, the status text) from the state already held above -- never
  // re-reading/re-parsing the file -- so an already-loaded file's status
  // survives a locale switch untouched. See
  // .vibe/decisions/009-i18n-integration-approach.md.
  onLocaleChange(() => {
    renderStaticText();
    render();
  });

  renderStaticText();
  render();
}
