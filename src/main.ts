import "@openkakutou/web-ui-kit/tokens.css";
import "@openkakutou/web-ui-kit";
import "./style.css";
import { setLifebarDocument } from "./document/lifebar-document-store.ts";
import { setSffSpriteSheet } from "./document/sff-sprite-sheet-store.ts";
import { renderLifebarFileInput } from "./input/lifebar-file-input-view.ts";
import { renderSpriteSheetInput } from "./input/sprite-sheet-input-view.ts";
import { appVersion } from "./version.ts";

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

  const tokensLoaded = options.designTokensLoaded ?? designTokensLoaded;
  if (!tokensLoaded()) {
    renderDesignTokensError(root);
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

  toolbar.append(title, versionText);
  shell.appendChild(toolbar);

  const main = document.createElement("main");

  const lifebarSection = document.createElement("div");
  renderLifebarFileInput(lifebarSection, {
    onLoaded: (lifebarDocument, fileName) => {
      setLifebarDocument({ fileName, document: lifebarDocument });
    },
  });
  main.appendChild(lifebarSection);

  const spriteSheetSection = document.createElement("div");
  renderSpriteSheetInput(spriteSheetSection, {
    onLoaded: ({ fileName, sffBytes, spriteGroups }) => {
      setSffSpriteSheet({ fileName, sffBytes, spriteGroups });
    },
  });
  main.appendChild(spriteSheetSection);

  shell.appendChild(main);

  root.appendChild(shell);
}

/**
 * Deliberately styled with no `web-ui-kit` tokens or custom elements: this
 * renders exactly in the scenario where those failed to load, so it must
 * stay visible without depending on them.
 */
function renderDesignTokensError(root: HTMLElement): void {
  const container = document.createElement("div");
  container.className = "design-tokens-error";

  const heading = document.createElement("h1");
  heading.textContent = `${APP_TITLE} failed to load`;
  container.appendChild(heading);

  const body = document.createElement("p");
  body.textContent =
    "The design system's tokens stylesheet didn't load. Try reloading the page; if this keeps happening, please report it.";
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
 */
function mount(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (app) {
    renderApp(app, appVersion);
  }
}

if (document.readyState === "complete") {
  mount();
} else {
  window.addEventListener("load", mount, { once: true });
}
