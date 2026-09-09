// DOM component for backlog item 003 (sprite sheet input): a single-file
// picker plus a drag-and-drop zone, wholesale-replacing the previous
// outcome (including the mounted browser) on every new drop — same
// single-slot interaction model as this app's own lifebar file input
// (.vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md).
// Distinguishes three failure causes with distinct, actionable status
// text: reading the file, bringing up the WASM module, and the module
// reporting a malformed file — see sprite-sheet-input.ts.
import { onLocaleChange, t } from "../i18n/i18n.ts";
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
 * What the status line currently shows -- a small tagged description of the
 * situation and its raw parameters, not pre-formatted text. Kept as data
 * (not a string) so a locale change can re-format it in the new language
 * without re-reading/re-decoding the sheet that produced it. See
 * .vibe/decisions/009-i18n-integration-approach.md.
 */
type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "success"; fileName: string; groupCount: number }
  | { kind: "read-error"; fileName: string; message: string }
  | { kind: "setup-error"; fileName: string; message: string }
  | { kind: "parse-error"; fileName: string; message: string };

function formatStatus(status: Status): string {
  switch (status.kind) {
    case "idle":
      return "";
    case "reading":
      return t("input.spriteSheet.reading", "Reading…");
    case "success":
      return t(
        "input.spriteSheet.success",
        "Loaded {{fileName}} — {{count}} group(s) found.",
        { fileName: status.fileName, count: String(status.groupCount) },
      );
    case "read-error":
      return t(
        "input.spriteSheet.errorRead",
        "Could not read {{fileName}}: {{message}}. Try selecting the file again.",
        { fileName: status.fileName, message: status.message },
      );
    case "setup-error":
      return t(
        "input.spriteSheet.errorSetup",
        'The sff WASM build isn\'t available ({{message}}). Run "npm run wasm:download -- <version>" to fetch it, then try again.',
        { message: status.message },
      );
    case "parse-error":
      return t(
        "input.spriteSheet.errorParse",
        "Could not parse {{fileName}}: {{message}}. Check that this is a valid .sff file.",
        { fileName: status.fileName, message: status.message },
      );
  }
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
  let status: Status = { kind: "idle" };

  const panel = document.createElement("wuik-panel");
  panel.className = "sprite-sheet-input";

  const dropZone = document.createElement("div");
  dropZone.className = "sprite-sheet-input__dropzone";

  const label = document.createElement("label");
  label.className = "sprite-sheet-input__label";
  label.htmlFor = "sprite-sheet-picker";

  const picker = document.createElement("input");
  picker.type = "file";
  picker.id = "sprite-sheet-picker";
  picker.accept = ".sff";

  const hint = document.createElement("p");
  hint.className = "sprite-sheet-input__hint";

  dropZone.append(label, picker, hint);

  const statusEl = document.createElement("div");
  statusEl.className = "sprite-sheet-input__status";
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");

  const browserContainer = document.createElement("div");

  panel.append(dropZone, statusEl, browserContainer);
  root.appendChild(panel);

  function renderStaticText(): void {
    label.textContent = t(
      "input.spriteSheet.label",
      "Select a sprite sheet (.sff)",
    );
    hint.textContent = t(
      "input.spriteSheet.dropHint",
      "…or drag and drop it here",
    );
  }

  function render(): void {
    dropZone.classList.toggle(
      "sprite-sheet-input__dropzone--loading",
      phase === "loading",
    );
    picker.disabled = phase === "loading";
    statusEl.classList.toggle(
      "sprite-sheet-input__status--error",
      phase === "error",
    );
    statusEl.textContent = formatStatus(status);
  }

  async function handleFile(file: File): Promise<void> {
    phase = "loading";
    status = { kind: "reading" };
    browserContainer.replaceChildren();
    render();

    const result = await loadSpriteSheetFromFile(file, options.fileOptions);

    if (result.status === "success") {
      phase = "success";
      status = {
        kind: "success",
        fileName: result.fileName,
        groupCount: result.spriteGroups.length,
      };
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
    status = {
      kind: result.status,
      fileName: result.fileName,
      message: result.message,
    };
    render();
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

  // This view (and the sprite browser it mounts) is only ever mounted once
  // per app session -- one subscription for its whole lifetime never
  // accumulates. Re-formats the static chrome and the status text from the
  // state already held above -- never re-reading/re-decoding the sheet --
  // so an already-decoded sprite browser and its own status survive a
  // locale switch untouched. See
  // .vibe/decisions/009-i18n-integration-approach.md.
  onLocaleChange(() => {
    renderStaticText();
    render();
  });

  renderStaticText();
  render();
}
