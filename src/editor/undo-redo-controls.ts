// Undo/Redo toolbar controls (backlog item 007): the explicit UI path to
// the shared command stack -- the shortcut-manager path is deferred until
// this app adopts one (item 008), see
// .vibe/decisions/007-undo-redo-scoped-to-current-document-shortcut-deferred.md.
// A thin view over `CommandStack`'s own `canUndo`/`canRedo`/`undo`/`redo`:
// this module owns no history of its own.
import type { CommandStack } from "@openkakutou/web-ui-kit";
import { commandStack as defaultCommandStack } from "../document/command-stack-store.ts";

export interface UndoRedoControlsOptions {
  /** The history to control. Defaults to this app's shared instance; injectable for testing. */
  commandStack?: CommandStack;
}

export interface UndoRedoControlsHandle {
  /**
   * Re-reads the stack's current `canUndo`/`canRedo` and updates each
   * control's disabled state accordingly. A caller that pushes a command
   * onto the shared stack from elsewhere (e.g. the elements editor's own
   * edit commands) must call this afterwards -- the stack itself has no
   * change event to subscribe to.
   */
  refresh(): void;
}

/**
 * Renders Undo/Redo controls into `root`, replacing its previous content.
 * Each control's own disabled state is the acceptance criteria's "undo/redo
 * state visibly reflected in the UI" -- there is no separate status text.
 */
export function renderUndoRedoControls(
  root: HTMLElement,
  options: UndoRedoControlsOptions = {},
): UndoRedoControlsHandle {
  root.replaceChildren();

  const stack = options.commandStack ?? defaultCommandStack;

  const undoButton = document.createElement("wuik-button");
  undoButton.setAttribute("variant", "secondary");
  undoButton.dataset.action = "undo";
  undoButton.textContent = "Undo";

  const redoButton = document.createElement("wuik-button");
  redoButton.setAttribute("variant", "secondary");
  redoButton.dataset.action = "redo";
  redoButton.textContent = "Redo";

  function refresh(): void {
    undoButton.toggleAttribute("disabled", !stack.canUndo);
    redoButton.toggleAttribute("disabled", !stack.canRedo);
  }

  undoButton.addEventListener("click", () => {
    stack.undo();
    refresh();
  });
  redoButton.addEventListener("click", () => {
    stack.redo();
    refresh();
  });

  refresh();
  root.append(undoButton, redoButton);

  return { refresh };
}
