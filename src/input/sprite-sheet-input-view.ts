// DOM component for backlog item 003 (sprite sheet input): a single-file
// picker plus a drag-and-drop zone, wholesale-replacing the previous
// outcome (including the mounted browser) on every new drop — same
// single-slot interaction model as this app's own lifebar file input
// (.vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md).
// Distinguishes three failure causes with distinct, actionable status
// text: reading the file, bringing up the WASM module, and the module
// reporting a malformed file — see sprite-sheet-input.ts.
import { renderSpriteBrowser } from "../viewer/sprite-browser.ts";
import type { SpriteGroup } from "../wasm/types.ts";
import {
  type SpriteSheetInputOptions,
  loadSpriteSheetFromFile,
} from "./sprite-sheet-input.ts";

export interface SpriteSheetInputViewOptions {
  /** Called once a sprite sheet has been read and decoded successfully. */
  onLoaded: (result: {
    fileName: string;
    sffBytes: Uint8Array;
    spriteGroups: SpriteGroup[];
  }) => void;
  /** Forwarded to the read/load layer; injectable for testing. */
  fileOptions?: SpriteSheetInputOptions;
}

/**
 * Renders the sprite sheet input into `root`, replacing its previous
 * content.
 */
export function renderSpriteSheetInput(
  root: HTMLElement,
  options: SpriteSheetInputViewOptions,
): void {
  root.replaceChildren();

  let phase: "idle" | "loading" | "success" | "error" = "idle";
  let statusMessage = "";

  const panel = document.createElement("wuik-panel");
  panel.className = "sprite-sheet-input";

  const dropZone = document.createElement("div");
  dropZone.className = "sprite-sheet-input__dropzone";

  const label = document.createElement("label");
  label.className = "sprite-sheet-input__label";
  label.htmlFor = "sprite-sheet-picker";
  label.textContent = "Select a sprite sheet (.sff)";

  const picker = document.createElement("input");
  picker.type = "file";
  picker.id = "sprite-sheet-picker";
  picker.accept = ".sff";

  const hint = document.createElement("p");
  hint.className = "sprite-sheet-input__hint";
  hint.textContent = "…or drag and drop it here";

  dropZone.append(label, picker, hint);

  const status = document.createElement("div");
  status.className = "sprite-sheet-input__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const browserContainer = document.createElement("div");

  panel.append(dropZone, status, browserContainer);
  root.appendChild(panel);

  function render(): void {
    dropZone.classList.toggle(
      "sprite-sheet-input__dropzone--loading",
      phase === "loading",
    );
    picker.disabled = phase === "loading";
    status.classList.toggle(
      "sprite-sheet-input__status--error",
      phase === "error",
    );
    status.textContent = statusMessage;
  }

  async function handleFile(file: File): Promise<void> {
    phase = "loading";
    statusMessage = "Reading…";
    browserContainer.replaceChildren();
    render();

    const result = await loadSpriteSheetFromFile(file, options.fileOptions);

    if (result.status === "success") {
      phase = "success";
      statusMessage = `Loaded ${result.fileName} — ${result.spriteGroups.length} group(s) found.`;
      render();
      renderSpriteBrowser(
        browserContainer,
        result.spriteGroups,
        result.sffBytes,
      );
      options.onLoaded({
        fileName: result.fileName,
        sffBytes: result.sffBytes,
        spriteGroups: result.spriteGroups,
      });
      return;
    }

    phase = "error";
    statusMessage = errorMessage(result);
    render();
  }

  function errorMessage(
    result:
      | { status: "read-error"; fileName: string; message: string }
      | { status: "setup-error"; fileName: string; message: string }
      | { status: "parse-error"; fileName: string; message: string },
  ): string {
    switch (result.status) {
      case "read-error":
        return `Could not read ${result.fileName}: ${result.message}. Try selecting the file again.`;
      case "setup-error":
        return `The sff WASM build isn't available (${result.message}). Run "npm run wasm:download -- <version>" to fetch it, then try again.`;
      case "parse-error":
        return `Could not parse ${result.fileName}: ${result.message}. Check that this is a valid .sff file.`;
    }
  }

  picker.addEventListener("change", () => {
    const file = picker.files?.[0];
    picker.value = "";
    if (file) void handleFile(file);
  });

  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropZone.classList.add("sprite-sheet-input__dropzone--dragging");
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("sprite-sheet-input__dropzone--dragging");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("sprite-sheet-input__dropzone--dragging");
    const file = (event as DragEvent).dataTransfer?.files?.[0];
    if (file) void handleFile(file);
  });

  render();
}
