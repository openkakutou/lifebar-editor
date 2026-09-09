import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import type { WuikShortcutsPanelElement } from "@openkakutou/web-ui-kit";
import type { WuikLocaleSwitcherElement } from "@openkakutou/web-ui-kit";
import { commandStack } from "./document/command-stack-store.ts";
import {
  type LifebarEditorDocument,
  getLifebarDocument,
  setLifebarDocument,
} from "./document/lifebar-document-store.ts";
import {
  getSffSpriteSheet,
  setSffSpriteSheet,
} from "./document/sff-sprite-sheet-store.ts";
import { renderElementsEditor } from "./editor/elements-editor.ts";
import { renderSaveExport } from "./editor/save-export.ts";
import { renderUndoRedoControls } from "./editor/undo-redo-controls.ts";
import { getI18n, initAppI18n, onLocaleChange, t } from "./i18n/i18n.ts";
import { renderLifebarFileInput } from "./input/lifebar-file-input-view.ts";
import { renderSpriteSheetInput } from "./input/sprite-sheet-input-view.ts";
import { appShortcutManager } from "./shortcuts/app-shortcut-manager.ts";
import { handleAppShortcutKeydown } from "./shortcuts/app-shortcuts.ts";
import {
  bindShortcutLabel,
  formatShortcutTitle,
} from "./shortcuts/shortcut-label.ts";
import { renderShortcutsPanelSection } from "./shortcuts/shortcuts-panel-section.ts";
import { appVersion } from "./version.ts";
import { renderNewLifebarWizard } from "./wizard/new-lifebar-wizard.ts";

/**
 * The one `window` keydown listener this app's shortcut dispatcher ever has
 * attached, so a repeated `renderApp` call (a real reload never does this,
 * but tests calling it many times against the same jsdom `window` do)
 * replaces it instead of piling another one on top -- the same "replace, not
 * append" contract `renderApp` already gives its own DOM content.
 */
let currentShortcutKeydownListener:
  | ((event: KeyboardEvent) => void)
  | undefined;

/**
 * `bindShortcutLabel` subscribes each button to the shared, long-lived
 * `appShortcutManager` singleton -- unlike the buttons themselves, that
 * singleton is never recreated across a repeated `renderApp` call, so its
 * subscriptions from a previous call must be torn down explicitly here too,
 * for the same "replace, don't accumulate" reason as the listener above.
 */
let currentShortcutLabelUnbinds: Array<() => void> = [];

/**
 * The shortcuts section's own `<wuik-shortcuts-panel>` instance, so a
 * repeated `renderApp` call can unset its `.manager` before the surrounding
 * DOM is discarded -- that setter is this element's only cleanup path (see
 * shortcuts-panel-section.ts), and nothing else ever calls it once this
 * element stops being part of the rendered tree.
 */
let currentShortcutsPanelElement: WuikShortcutsPanelElement | undefined;

/**
 * `renderApp` is only ever really invoked once per page (from `mount()`),
 * but tests call it repeatedly on the same or a fresh root -- torn down at
 * the top of every call, before a fresh one is made, so a locale-change
 * subscription from a previous call never accumulates or fires against
 * content no longer on the page. Mirrors `lifebar-viewer-web`'s own
 * equivalent (`.vibe/decisions/009-i18n-integration-approach.md`).
 */
let currentUnsubscribeLocaleChange: (() => void) | undefined;

// The app's own brand name -- a proper noun, deliberately never translated
// (see .vibe/decisions/009-i18n-integration-approach.md).
const APP_TITLE = "Lifebar Editor";

/**
 * A design token only `web-ui-kit`'s tokens stylesheet defines. Its
 * presence on the given element is used as a proxy for "the stylesheet
 * actually loaded" — if the linked CSS asset 404s or otherwise fails at
 * runtime, this custom property resolves to nothing.
 */
const TOKEN_PROBE = "--wuik-color-bg";

/**
 * Checks whether `web-ui-kit`'s design tokens stylesheet actually applied
 * to `target`, by probing a known custom property it defines. No load/error
 * event listener is needed: the browser blocks a `<script type="module">`'s
 * execution until a preceding `<link rel="stylesheet">` has settled (loaded
 * or failed), so by the time this module runs the stylesheet has already
 * resolved one way or the other — see
 * .vibe/decisions/001-web-ui-kit-scaffold-adoption-and-token-failure-detection.md.
 */
export function designTokensLoaded(
  target: Element = document.documentElement,
): boolean {
  return getComputedStyle(target).getPropertyValue(TOKEN_PROBE).trim() !== "";
}

export interface RenderAppOptions {
  /** Overridable for testing; defaults to the real stylesheet probe. */
  designTokensLoaded?: () => boolean;
}

/**
 * Builds the app's root frame — a `web-ui-kit` `<wuik-app-shell>` with the
 * app title as a single `<h1>` and the version as separate secondary text
 * in the toolbar, plus the lifebar file input (backlog item 002) and the
 * sprite sheet input (backlog item 003) as the main content. Once a file
 * loads successfully, its parsed document is stored in the in-memory
 * `LifebarEditorDocument` (src/document/lifebar-document-store.ts) or
 * `SffSpriteSheetDocument` (src/document/sff-sprite-sheet-store.ts) —
 * the form later editor screens (004+) read from. The title and version
 * are deliberately two
 * elements, not one combined string, so assistive tech reads one
 * unambiguous heading instead of announcing the version as part of it —
 * see .vibe/decisions/001-web-ui-kit-scaffold-adoption-and-token-failure-detection.md.
 * No sidebar content is slotted yet: this is a scaffold-only adoption, no
 * other screen exists in this repo yet to navigate to.
 *
 * If the design tokens stylesheet failed to load at runtime, the shell is
 * not mounted at all — it depends on those same tokens for its own layout
 * and would render broken/unstyled — and a plain, dependency-free error
 * message is shown instead, so the page is never blank.
 */
export function renderApp(
  root: HTMLElement,
  version: string,
  options: RenderAppOptions = {},
): void {
  root.replaceChildren();
  document.title = `${APP_TITLE} — v${version}`;

  if (currentShortcutKeydownListener !== undefined) {
    window.removeEventListener("keydown", currentShortcutKeydownListener);
    currentShortcutKeydownListener = undefined;
  }
  for (const unbind of currentShortcutLabelUnbinds) {
    unbind();
  }
  currentShortcutLabelUnbinds = [];
  if (currentShortcutsPanelElement !== undefined) {
    currentShortcutsPanelElement.manager = undefined;
    currentShortcutsPanelElement = undefined;
  }
  currentUnsubscribeLocaleChange?.();
  currentUnsubscribeLocaleChange = undefined;

  const tokensLoaded = options.designTokensLoaded ?? designTokensLoaded;
  if (!tokensLoaded()) {
    renderDesignTokensError(root);
    currentUnsubscribeLocaleChange = onLocaleChange(() =>
      renderDesignTokensError(root),
    );
    return;
  }

  const shell = document.createElement("wuik-app-shell");

  const toolbar = document.createElement("wuik-toolbar");
  toolbar.slot = "toolbar";
  toolbar.setAttribute("role", "banner");

  const title = document.createElement("h1");
  title.className = "app-title";
  title.textContent = APP_TITLE;

  const versionText = document.createElement("span");
  versionText.className = "app-version";
  versionText.textContent = `v${version}`;

  const undoRedoSection = document.createElement("div");
  undoRedoSection.className = "app-undo-redo";
  const undoRedoControls = renderUndoRedoControls(undoRedoSection);
  currentShortcutLabelUnbinds.push(
    bindShortcutLabel(
      undoRedoControls.undoButton,
      appShortcutManager,
      "undo",
      t("actions.undo", "Undo"),
    ),
    bindShortcutLabel(
      undoRedoControls.redoButton,
      appShortcutManager,
      "redo",
      t("actions.redo", "Redo"),
    ),
  );

  const localeSwitcher = document.createElement(
    "wuik-locale-switcher",
  ) as unknown as WuikLocaleSwitcherElement;
  localeSwitcher.className = "locale-switcher";
  localeSwitcher.setAttribute("label", t("app.languageLabel", "Language"));
  localeSwitcher.i18n = getI18n();

  toolbar.append(title, versionText, undoRedoSection, localeSwitcher);
  shell.appendChild(toolbar);

  const main = document.createElement("main");

  const elementsSection = document.createElement("div");
  // Persisted across re-renders (not recreated per call) so expanding a
  // section, then loading a sprite sheet, doesn't collapse it again --
  // see elements-editor.ts's own ElementsEditorOptions.expandedSections.
  const expandedElementSections = new Set<number>();
  const refreshElementsEditor = (): void => {
    renderElementsEditor(
      elementsSection,
      getLifebarDocument()?.document ?? null,
      getSffSpriteSheet()?.spriteGroups ?? null,
      {
        expandedSections: expandedElementSections,
        onEntryChange: (sectionIndex, entryIndex, oldValue, newValue) => {
          // The document is already mutated to `newValue` by
          // elements-editor.ts itself -- `do` below re-applies it (a no-op
          // the first time, essential on redo, after `undo` reverted it).
          // See .vibe/decisions/007-undo-redo-scoped-to-current-document-shortcut-deferred.md
          // for why each commit is its own history entry (item 007).
          //
          // `undoRedoControls.refresh()` is called here, after `push`
          // returns -- not from inside `do`/`undo` themselves. CommandStack
          // records the entry (or moves it between its undo/redo stacks)
          // *after* invoking `do`/`undo`, so refreshing from inside them
          // would read `canUndo`/`canRedo` one step stale.
          commandStack.push({
            do: () => {
              const entry =
                getLifebarDocument()?.document.sections[sectionIndex].entries[
                  entryIndex
                ];
              if (entry) entry.value = newValue;
              refreshElementsEditor();
            },
            undo: () => {
              const entry =
                getLifebarDocument()?.document.sections[sectionIndex].entries[
                  entryIndex
                ];
              if (entry) entry.value = oldValue;
              refreshElementsEditor();
            },
          });
          undoRedoControls.refresh();
        },
      },
    );
  };

  const lifebarSection = document.createElement("div");
  renderLifebarFileInput(lifebarSection, {
    onLoaded: (lifebarDocument, fileName) => {
      commandStack.clear();
      setLifebarDocument({ fileName, document: lifebarDocument });
      refreshElementsEditor();
      undoRedoControls.refresh();
    },
  });
  main.appendChild(lifebarSection);

  const newLifebarWizardSection = document.createElement("div");
  // No internal state of its own (unlike the file inputs/sprite browser/
  // save-export) -- a full re-render on a locale change (see the
  // `onLocaleChange` subscription below) is cheap and loses nothing. See
  // .vibe/decisions/009-i18n-integration-approach.md.
  const refreshWizard = (): void => {
    renderNewLifebarWizard(newLifebarWizardSection, {
      onCreated: (doc: LifebarEditorDocument) => {
        commandStack.clear();
        setLifebarDocument(doc);
        refreshElementsEditor();
        undoRedoControls.refresh();
        // The wizard commits immediately, with no second confirm/preview
        // screen, so moving focus into the newly mounted elements editor is
        // the only positive confirmation a keyboard/screen-reader user gets
        // that creation actually landed — same reasoning as `stage-editor`'s
        // own New Stage Wizard (.vibe/decisions/006). A no-op for a blank
        // lifebar, which has no section to focus yet.
        elementsSection
          .querySelector<HTMLElement>(".elements-editor__section-toggle")
          ?.focus();
      },
    });
  };
  refreshWizard();
  main.appendChild(newLifebarWizardSection);

  const spriteSheetSection = document.createElement("div");
  renderSpriteSheetInput(spriteSheetSection, {
    onLoaded: ({ fileName, sffBytes, spriteGroups }) => {
      setSffSpriteSheet({ fileName, sffBytes, spriteGroups });
      refreshElementsEditor();
    },
  });
  main.appendChild(spriteSheetSection);

  main.appendChild(elementsSection);

  const saveExportSection = document.createElement("div");
  const saveExportHandle = renderSaveExport(saveExportSection);
  currentShortcutLabelUnbinds.push(
    bindShortcutLabel(
      saveExportHandle.button,
      appShortcutManager,
      "save-export",
      t("actions.saveExport", "Save / Export"),
    ),
  );
  main.appendChild(saveExportSection);

  const shortcutsPanelSection = document.createElement("div");
  currentShortcutsPanelElement = renderShortcutsPanelSection(
    shortcutsPanelSection,
    appShortcutManager,
  );
  main.appendChild(shortcutsPanelSection);

  currentShortcutKeydownListener = (event: KeyboardEvent) => {
    handleAppShortcutKeydown(event, appShortcutManager, {
      onSaveExport: () => saveExportHandle.triggerSaveExport(),
      onUndo: () => undoRedoControls.undo(),
      onRedo: () => undoRedoControls.redo(),
    });
  };
  window.addEventListener("keydown", currentShortcutKeydownListener);

  shell.appendChild(main);

  root.appendChild(shell);

  // Live locale switching (backlog item 009): re-translates every piece of
  // "chrome" main.ts owns directly -- the switcher's own label, the
  // Undo/Redo/Save-Export buttons' text and shortcut-hint title/
  // aria-keyshortcuts -- and re-invokes the elements editor's own existing
  // refresh closure (already reused for every other data-change trigger),
  // which preserves the current expanded-sections Set untouched. Recomputing
  // the shortcut hint directly here (rather than re-calling
  // `bindShortcutLabel`) avoids attaching a second "change" listener onto
  // the shared, long-lived `appShortcutManager` on every language switch --
  // see .vibe/decisions/009-i18n-integration-approach.md. Each view with its
  // own session-important state (the file inputs, the sprite browser,
  // Save/Export's own status text, the shortcuts panel's collapsed state)
  // retranslates itself, from its own internal `onLocaleChange`
  // subscription, without main.ts's help.
  const applyShortcutHint = (
    element: HTMLElement,
    actionId: string,
    baseLabelKey: string,
    baseLabelDefault: string,
  ): void => {
    const key = appShortcutManager.getBinding(actionId);
    element.title = formatShortcutTitle(t(baseLabelKey, baseLabelDefault), key);
  };
  currentUnsubscribeLocaleChange = onLocaleChange(() => {
    localeSwitcher.setAttribute("label", t("app.languageLabel", "Language"));
    undoRedoControls.undoButton.textContent = t("actions.undo", "Undo");
    undoRedoControls.redoButton.textContent = t("actions.redo", "Redo");
    applyShortcutHint(
      undoRedoControls.undoButton,
      "undo",
      "actions.undo",
      "Undo",
    );
    applyShortcutHint(
      undoRedoControls.redoButton,
      "redo",
      "actions.redo",
      "Redo",
    );
    applyShortcutHint(
      saveExportHandle.button,
      "save-export",
      "actions.saveExport",
      "Save / Export",
    );
    refreshElementsEditor();
    refreshWizard();
  });
}

/**
 * Deliberately styled with no `web-ui-kit` tokens or custom elements: this
 * renders exactly in the scenario where those failed to load, so it must
 * stay visible without depending on them. Re-invoked (replacing its own
 * previous content) on a locale change, so its text stays live too even
 * though no `<wuik-locale-switcher>` is available in this degraded state --
 * the browser-detected/persisted locale still applies via `t()`.
 */
function renderDesignTokensError(root: HTMLElement): void {
  root.replaceChildren();

  const container = document.createElement("div");
  container.className = "design-tokens-error";

  const heading = document.createElement("h1");
  heading.textContent = t(
    "errors.designTokensFailedHeading",
    "{{title}} failed to load",
    { title: APP_TITLE },
  );
  container.appendChild(heading);

  const body = document.createElement("p");
  body.textContent = t(
    "errors.designTokensFailedBody",
    "The design system's tokens stylesheet didn't load. Try reloading the page; if this keeps happening, please report it.",
  );
  container.appendChild(body);

  root.appendChild(container);
}

/**
 * The built `<script type="module">` tag is emitted before the tokens
 * `<link rel="stylesheet">` tag (Vite's own asset injection order) and
 * module scripts aren't parser-blocked by a *following* stylesheet the way
 * classic scripts are — so probing immediately here could race the
 * stylesheet and false-negative while it's still in flight. `window`'s
 * `load` event is spec-guaranteed to fire only after every stylesheet
 * referenced at parse time has settled, so waiting for it (a no-op if it
 * has already fired) makes the probe accurate.
 *
 * `initAppI18n` is awaited here, before the very first `renderApp` call --
 * never inside `renderApp` itself, which stays synchronous so tests can
 * keep calling it directly with deterministic English defaults (see
 * .vibe/decisions/009-i18n-integration-approach.md). This is also why the
 * real app never flashes English before a persisted locale resolves: the
 * first paint already has the right language.
 */
async function mount(): Promise<void> {
  await initAppI18n();
  const app = document.querySelector<HTMLDivElement>("#app");
  if (app) {
    renderApp(app, appVersion);
  }
}

if (document.readyState === "complete") {
  void mount();
} else {
  window.addEventListener("load", () => void mount(), { once: true });
}
