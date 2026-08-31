// New Lifebar Wizard (backlog item 006): an alternative entry point to the
// file input — lets the user start editing a brand-new lifebar (from
// scratch, or from a bundled starter template) without loading any file.
// Rendered as its own, visually distinct section next to the file input
// rather than blended into it — "load" and "create new" are different
// verbs, not two options in one list, mirroring the sibling `stage-editor`
// repo's own New Stage Wizard (backlog item 005), whose UI/UX consultation
// this ports directly rather than re-deriving. See
// .vibe/decisions/006-new-lifebar-wizard-defaults-and-unsaved-changes-guard.md.
import type { LifebarEditorDocument } from "../document/lifebar-document-store.ts";
import { hasUnsavedLifebarChanges as defaultHasUnsavedChanges } from "../document/lifebar-document-store.ts";
import {
  LIFEBAR_TEMPLATES,
  createBlankLifebar,
} from "./new-lifebar-defaults.ts";

export interface NewLifebarWizardOptions {
  /** Called with a freshly-built lifebar document once creation is confirmed (or nothing was at risk). */
  onCreated: (doc: LifebarEditorDocument) => void;
  /** Reports whether the currently loaded lifebar has unsaved edits. Defaults to the real document store; injectable for testing. */
  hasUnsavedChanges?: () => boolean;
  /** Confirms discarding unsaved changes. Defaults to the browser's native `confirm`; injectable for testing. */
  confirmDiscard?: (message: string) => boolean;
}

const DISCARD_CONFIRM_MESSAGE =
  "You have unsaved changes to the current lifebar. Starting a new lifebar will discard them. Continue?";

function blankEditorDocument(): LifebarEditorDocument {
  return { fileName: "fight.def", document: createBlankLifebar() };
}

function templateEditorDocument(templateId: string): LifebarEditorDocument {
  const template = LIFEBAR_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`unknown lifebar template: ${templateId}`);
  return { fileName: "fight.def", document: template.build() };
}

/**
 * Renders the New Lifebar Wizard into `root`, replacing its previous
 * content.
 */
export function renderNewLifebarWizard(
  root: HTMLElement,
  options: NewLifebarWizardOptions,
): void {
  root.replaceChildren();

  const hasUnsavedChanges =
    options.hasUnsavedChanges ?? defaultHasUnsavedChanges;
  const confirmDiscard =
    options.confirmDiscard ?? ((message: string) => window.confirm(message));

  function createIfConfirmed(build: () => LifebarEditorDocument): void {
    if (hasUnsavedChanges() && !confirmDiscard(DISCARD_CONFIRM_MESSAGE)) {
      return;
    }
    options.onCreated(build());
  }

  const panel = document.createElement("wuik-panel");
  panel.className = "new-lifebar-wizard";

  const heading = document.createElement("h2");
  heading.textContent = "Start a New Lifebar";
  panel.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "new-lifebar-wizard__actions";

  const blankButton = document.createElement("wuik-button");
  blankButton.dataset.action = "new-lifebar-blank";
  blankButton.textContent = "Blank Lifebar";
  blankButton.addEventListener("click", () => {
    createIfConfirmed(blankEditorDocument);
  });
  actions.appendChild(blankButton);

  for (const template of LIFEBAR_TEMPLATES) {
    const templateButton = document.createElement("wuik-button");
    templateButton.setAttribute("variant", "secondary");
    templateButton.dataset.action = "new-lifebar-template";
    templateButton.dataset.templateId = template.id;
    templateButton.textContent = template.label;
    templateButton.addEventListener("click", () => {
      createIfConfirmed(() => templateEditorDocument(template.id));
    });
    actions.appendChild(templateButton);
  }

  panel.appendChild(actions);
  root.appendChild(panel);
}
