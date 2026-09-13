// DOM component for backlog item 011 (lifebar folder input): folder
// selection is the only input path (a native `<input webkitdirectory>`
// picker plus a drag-and-drop zone), replacing item 002's single-file
// picker/drop zone outright rather than keeping both — see
// .vibe/decisions/010-folder-selection-replaces-single-file-lifebar-input.md.
// Every interactive control is a real native element (file input, radio
// inputs) or `web-ui-kit`'s own styled equivalent (`<wuik-button>`) rather
// than a custom `role="button"` div, so keyboard operability comes for
// free from the browser. Ported from `lifebar-viewer-web`'s own
// `lifebar-folder-input-view.ts` (same domain, same status-state shape),
// minus that app's sprite-sheet-resolution concerns — this app's sprite
// sheet input is a separate, unrelated single-file input that stays
// untouched.
//
// The currently-displayed status is kept as a small unformatted `Status`
// descriptor, not a pre-formatted string, so a live locale change (see
// .vibe/decisions/009-i18n-integration-approach.md) can re-format and
// redisplay it in the new language without re-running the load/parse that
// produced it.
import { onLocaleChange, t } from "../i18n/i18n.ts";
import type { LifebarDocument } from "../lifebar/document.ts";
import {
  type DataTransferItemLike,
  filesFromDataTransferItems,
  filesFromWebkitDirectoryFiles,
} from "./folder-entries.ts";
import type { GatheredFile } from "./folder-entries.ts";
import {
  type LifebarFolderInputOptions,
  type LifebarFolderInputResult,
  loadLifebarFromChosenEntry,
  loadLifebarFromFolderFiles,
} from "./lifebar-folder-input.ts";

export interface LifebarFolderInputViewOptions {
  /** Called once a folder's lifebar file has been read and parsed successfully. */
  onLoaded: (document: LifebarDocument, fileName: string) => void;
  /** Forwarded to the read/parse layer; injectable for testing. */
  fileOptions?: LifebarFolderInputOptions;
}

type Phase = "idle" | "loading" | "needs-selection" | "done";

type ErrorResult = Exclude<
  LifebarFolderInputResult,
  { status: "success" | "needs-selection" }
>;

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "success"; fileName: string; sectionCount: number }
  | { kind: "needsSelection"; count: number }
  | { kind: "error"; result: ErrorResult; source: "picker" | "drop" };

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
    case "needsSelection":
      return t(
        "input.lifebar.needsSelection",
        "Found {{count}} possible lifebar files — pick which one to load.",
        { count: String(status.count) },
      );
    case "error":
      return formatErrorMessage(status.result, status.source);
  }
}

function formatErrorMessage(
  result: ErrorResult,
  source: "picker" | "drop",
): string {
  switch (result.status) {
    case "no-files":
      return source === "drop"
        ? t(
            "input.lifebar.errorNoFilesDrop",
            "Couldn't read anything from the dropped folder — your browser may not support folder drag-and-drop here. Try the folder picker button instead.",
          )
        : t(
            "input.lifebar.errorNoFilesPicker",
            "This folder is empty — pick a folder that contains the lifebar's .def-style file.",
          );
    case "no-candidate":
      return t(
        "input.lifebar.errorNoCandidate",
        "No .def-style lifebar file found in this folder — expected one like fight.def.",
      );
    case "read-error":
      return t(
        "input.lifebar.errorRead",
        "Could not read {{fileName}}: {{message}}",
        { fileName: result.fileName, message: result.message },
      );
    case "parse-error":
      return t(
        "input.lifebar.errorParse",
        "Could not parse {{fileName}}: {{message}}",
        { fileName: result.fileName, message: result.message },
      );
  }
}

/**
 * Renders the folder-based lifebar input into `root`, replacing its
 * previous content.
 */
export function renderLifebarFolderInput(
  root: HTMLElement,
  options: LifebarFolderInputViewOptions,
): void {
  root.replaceChildren();

  let phase: Phase = "idle";
  let status: Status = { kind: "idle" };
  let lastSource: "picker" | "drop" = "picker";
  let selectedIndex: number | null = null;

  const panel = document.createElement("wuik-panel");
  panel.className = "lifebar-folder-input";

  const dropZone = document.createElement("div");
  dropZone.className = "lifebar-folder-input__dropzone";

  const label = document.createElement("label");
  label.className = "lifebar-folder-input__label";
  label.htmlFor = "lifebar-folder-picker";

  const picker = document.createElement("input");
  picker.type = "file";
  picker.id = "lifebar-folder-picker";
  picker.setAttribute("webkitdirectory", "");
  picker.multiple = true;

  const hint = document.createElement("p");
  hint.className = "lifebar-folder-input__hint";

  dropZone.append(label, picker, hint);

  const selectionContainer = document.createElement("div");
  selectionContainer.className = "lifebar-folder-input__selection";
  selectionContainer.hidden = true;

  const statusEl = document.createElement("div");
  statusEl.className = "lifebar-folder-input__status";
  statusEl.setAttribute("role", "status");
  statusEl.setAttribute("aria-live", "polite");

  const resetButton = document.createElement("wuik-button");
  resetButton.setAttribute("variant", "secondary");
  resetButton.className = "lifebar-folder-input__reset";
  resetButton.dataset.action = "reset";
  resetButton.hidden = true;

  panel.append(dropZone, selectionContainer, statusEl, resetButton);
  root.appendChild(panel);

  // Elements created by `renderSelection`, kept for a live locale change to
  // update their text in place without rebuilding the list itself (which
  // would drop the user's in-progress radio selection).
  let selectionPrompt: HTMLParagraphElement | null = null;
  let selectionGroup: HTMLElement | null = null;
  let selectionConfirmButton: HTMLElement | null = null;

  function renderStaticText(): void {
    label.textContent = t(
      "input.lifebar.folderLabel",
      "Select a lifebar folder (containing its .def-style file, e.g. fight.def)",
    );
    hint.textContent = t(
      "input.lifebar.dropHint",
      "…or drag and drop a lifebar folder here",
    );
    resetButton.textContent = t(
      "input.lifebar.resetButton",
      "Choose a different folder",
    );
    if (selectionPrompt) {
      selectionPrompt.textContent = t(
        "input.lifebar.selectionPrompt",
        "Which file is the lifebar?",
      );
    }
    if (selectionGroup) {
      selectionGroup.setAttribute(
        "aria-label",
        t("input.lifebar.candidateGroupLabel", "Candidate lifebar files"),
      );
    }
    if (selectionConfirmButton) {
      selectionConfirmButton.textContent = t(
        "input.lifebar.confirmSelection",
        "Load selected file",
      );
    }
  }

  function render(): void {
    dropZone.classList.toggle(
      "lifebar-folder-input__dropzone--loading",
      phase === "loading",
    );
    picker.disabled = phase === "loading";
    statusEl.classList.toggle(
      "lifebar-folder-input__status--error",
      status.kind === "error",
    );
    statusEl.textContent = formatStatus(status);
    resetButton.hidden = phase === "idle" || phase === "loading";
    selectionContainer.hidden = phase !== "needs-selection";
  }

  function resetToIdle(): void {
    phase = "idle";
    status = { kind: "idle" };
    selectedIndex = null;
    picker.value = "";
    selectionContainer.replaceChildren();
    selectionPrompt = null;
    selectionGroup = null;
    selectionConfirmButton = null;
    render();
  }

  function renderSelection(candidates: GatheredFile[]): void {
    selectionContainer.replaceChildren();
    selectedIndex = null;

    const prompt = document.createElement("p");
    selectionPrompt = prompt;

    const group = document.createElement("div");
    group.setAttribute("role", "radiogroup");
    selectionGroup = group;

    const confirmButton = document.createElement("wuik-button");
    confirmButton.dataset.action = "confirm-selection";
    confirmButton.setAttribute("disabled", "");
    selectionConfirmButton = confirmButton;

    candidates.forEach((candidate, index) => {
      const optionLabel = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "lifebar-candidate";
      input.value = String(index);
      // A jsdom quirk: `.click()` on a radio reliably toggles `.checked`
      // but doesn't reliably synthesize a "change" event under this
      // project's pinned jsdom — read the selection from "click" instead,
      // the same workaround `lifebar-viewer-web`'s own folder input uses.
      input.addEventListener("click", () => {
        selectedIndex = index;
        confirmButton.removeAttribute("disabled");
      });
      optionLabel.append(
        input,
        document.createTextNode(` ${candidate.relativePath}`),
      );
      group.appendChild(optionLabel);
    });

    confirmButton.addEventListener("click", () => {
      if (selectedIndex === null) return;
      const chosen = candidates[selectedIndex];
      phase = "loading";
      status = { kind: "reading" };
      render();
      void finishLoading(
        loadLifebarFromChosenEntry(chosen, options.fileOptions),
      );
    });

    selectionContainer.append(prompt, group, confirmButton);
    renderStaticText();
  }

  async function finishLoading(
    resultPromise: Promise<LifebarFolderInputResult>,
  ): Promise<void> {
    const result = await resultPromise;

    if (result.status === "success") {
      phase = "done";
      status = {
        kind: "success",
        fileName: result.fileName,
        sectionCount: result.document.sections.length,
      };
      render();
      options.onLoaded(result.document, result.fileName);
      return;
    }

    if (result.status === "needs-selection") {
      phase = "needs-selection";
      status = { kind: "needsSelection", count: result.candidates.length };
      renderSelection(result.candidates);
      render();
      return;
    }

    phase = "done";
    status = { kind: "error", result, source: lastSource };
    render();
  }

  function handleGathered(
    files: GatheredFile[],
    source: "picker" | "drop",
  ): void {
    lastSource = source;
    phase = "loading";
    status = { kind: "reading" };
    selectionContainer.replaceChildren();
    selectionPrompt = null;
    selectionGroup = null;
    selectionConfirmButton = null;
    render();
    void finishLoading(loadLifebarFromFolderFiles(files, options.fileOptions));
  }

  picker.addEventListener("change", () => {
    const files = picker.files ? Array.from(picker.files) : [];
    handleGathered(filesFromWebkitDirectoryFiles(files), "picker");
  });

  resetButton.addEventListener("click", resetToIdle);

  dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropZone.classList.add("lifebar-folder-input__dropzone--dragging");
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("lifebar-folder-input__dropzone--dragging");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("lifebar-folder-input__dropzone--dragging");
    const dataTransfer = (event as DragEvent).dataTransfer as {
      items?: ArrayLike<DataTransferItemLike>;
    } | null;
    const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
    void filesFromDataTransferItems(items).then((files) =>
      handleGathered(files, "drop"),
    );
  });

  // This view is only ever mounted once per app session (see main.ts's
  // renderApp) -- one subscription for its whole lifetime never
  // accumulates. Re-formats whatever is currently shown (the static
  // chrome, the status text, the selection screen's labels) from the state
  // already held above -- never re-reading/re-parsing the file -- so an
  // already-loaded file's status or an in-progress candidate pick survives
  // a locale switch untouched. See
  // .vibe/decisions/009-i18n-integration-approach.md.
  onLocaleChange(() => {
    renderStaticText();
    render();
  });

  renderStaticText();
  render();
}
