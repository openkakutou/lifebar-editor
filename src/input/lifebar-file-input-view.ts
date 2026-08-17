// DOM component for backlog item 002 (lifebar file input): a single-file
// picker plus a drag-and-drop zone, wholesale-replacing the previous
// outcome on every new drop — see
// .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md for why
// this is a single-slot model, unlike character-editor's accumulating
// multi-slot file input.
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
  let statusMessage = "";

  const panel = document.createElement("wuik-panel");
  panel.className = "lifebar-input";

  const dropZone = document.createElement("div");
  dropZone.className = "lifebar-input__dropzone";

  const label = document.createElement("label");
  label.className = "lifebar-input__label";
  label.htmlFor = "lifebar-file-picker";
  label.textContent = "Select the lifebar file (e.g. fight.def)";

  const picker = document.createElement("input");
  picker.type = "file";
  picker.id = "lifebar-file-picker";
  picker.accept = ".def";

  const hint = document.createElement("p");
  hint.className = "lifebar-input__hint";
  hint.textContent = "…or drag and drop it here";

  dropZone.append(label, picker, hint);

  const status = document.createElement("div");
  status.className = "lifebar-input__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  panel.append(dropZone, status);
  root.appendChild(panel);

  function render(): void {
    dropZone.classList.toggle(
      "lifebar-input__dropzone--loading",
      phase === "loading",
    );
    picker.disabled = phase === "loading";
    status.classList.toggle("lifebar-input__status--error", phase === "error");
    status.textContent = statusMessage;
  }

  async function handleFile(file: File): Promise<void> {
    phase = "loading";
    statusMessage = "Reading…";
    render();

    const result = await loadLifebarFromFile(file, options.fileOptions);

    if (result.status === "success") {
      phase = "success";
      statusMessage = `Loaded ${result.fileName} — ${result.document.sections.length} section(s) found.`;
      render();
      options.onLoaded(result.document, result.fileName);
      return;
    }

    phase = "error";
    statusMessage =
      result.status === "read-error"
        ? `Could not read ${file.name}: ${result.message}`
        : `Could not parse ${file.name}: ${result.message}`;
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

  render();
}
