import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLifebarDocument,
  hasUnsavedLifebarChanges,
  resetLifebarDocumentForTests,
} from "./document/lifebar-document-store.ts";
import { resetSffSpriteSheetForTests } from "./document/sff-sprite-sheet-store.ts";
import { designTokensLoaded, renderApp } from "./main.ts";

function fileFromText(name: string, text: string): File {
  return new File([text], name, { type: "text/plain" });
}

function dispatchDrop(dropZone: Element, files: File[]): void {
  const dataTransfer = { files } as unknown as DataTransfer;
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  dropZone.dispatchEvent(event);
}

describe("renderApp", () => {
  beforeEach(() => {
    document.title = "";
    resetLifebarDocumentForTests();
    resetSffSpriteSheetForTests();
  });

  it("mounts a wuik-app-shell root frame with a toolbar heading and version when design tokens are loaded", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    const shell = root.querySelector("wuik-app-shell");
    expect(shell).not.toBeNull();

    const toolbar = shell?.querySelector('[slot="toolbar"]');
    expect(toolbar?.tagName.toLowerCase()).toBe("wuik-toolbar");
    expect(toolbar?.getAttribute("role")).toBe("banner");

    expect(shell?.querySelector("main")).not.toBeNull();
  });

  it("gives the app title exactly one heading, separate from the version text", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    const toolbar = root.querySelector('[slot="toolbar"]');
    const headings = toolbar?.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings?.[0].textContent).toBe("Lifebar Editor");

    const version = toolbar?.querySelector(".app-version");
    expect(version).not.toBeNull();
    expect(version?.tagName.toLowerCase()).not.toBe("h1");
    expect(version?.textContent).toBe("v0.1.0");
  });

  it("does not slot anything into the sidebar region", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    expect(root.querySelector('[slot="sidebar"]')).toBeNull();
  });

  it("sets the document title to the app name and version", () => {
    const root = document.createElement("div");

    renderApp(root, "0.2.3", { designTokensLoaded: () => true });

    expect(document.title).toBe("Lifebar Editor — v0.2.3");
  });

  it("replaces previous content instead of appending on repeated renders", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => true });
    renderApp(root, "0.2.0", { designTokensLoaded: () => true });

    expect(root.querySelectorAll("wuik-app-shell")).toHaveLength(1);
    expect(
      root.querySelector('[slot="toolbar"] .app-version')?.textContent,
    ).toBe("v0.2.0");
  });

  it("renders without throwing and keeps a valid structure when given an empty version string", () => {
    const root = document.createElement("div");

    expect(() =>
      renderApp(root, "", { designTokensLoaded: () => true }),
    ).not.toThrow();
    expect(
      root.querySelector('[slot="toolbar"] .app-version')?.textContent,
    ).toBe("v");
  });

  it("shows a visible error message instead of a blank page when the design tokens stylesheet fails to load", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => false });

    expect(root.querySelector("wuik-app-shell")).toBeNull();
    const error = root.querySelector(".design-tokens-error");
    expect(error).not.toBeNull();
    expect(error?.textContent).toMatch(/failed to load/i);
  });

  it("still sets a document title when the design tokens stylesheet fails to load", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => false });

    expect(document.title).toBe("Lifebar Editor — v0.1.0");
  });

  it("mounts the lifebar file input into the shell's main content", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    expect(root.querySelector(".lifebar-input__dropzone")).not.toBeNull();
  });

  it("stores the loaded lifebar document in memory once a file parses successfully", async () => {
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    const dropZone = root.querySelector(".lifebar-input__dropzone");
    if (!dropZone) throw new Error("dropzone not found");
    dispatchDrop(dropZone, [
      fileFromText("fight.def", "[Info]\nname = Default\n"),
    ]);

    await vi.waitFor(() => {
      expect(getLifebarDocument()).not.toBeNull();
    });

    expect(getLifebarDocument()?.fileName).toBe("fight.def");
    expect(getLifebarDocument()?.document.sections).toHaveLength(1);
  });

  it("renders the elements editor for the loaded lifebar document's sections", async () => {
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    const dropZone = root.querySelector(".lifebar-input__dropzone");
    if (!dropZone) throw new Error("dropzone not found");
    dispatchDrop(dropZone, [
      fileFromText("fight.def", "[Info]\nname = Default\n"),
    ]);

    await vi.waitFor(() => {
      expect(
        root.querySelector(".elements-editor__section-toggle"),
      ).not.toBeNull();
    });

    expect(
      root.querySelectorAll(".elements-editor__section-toggle"),
    ).toHaveLength(1);
  });

  it("renders no elements editor before any lifebar file has loaded", () => {
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    expect(root.querySelector(".elements-editor")).toBeNull();
  });

  it("mounts the save/export action into the shell's main content", () => {
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    expect(root.querySelector('[data-action="save-export"]')).not.toBeNull();
  });
});

describe("designTokensLoaded", () => {
  it("returns true when the probe token resolves to a real value on the given element", () => {
    const el = document.createElement("div");
    el.style.setProperty("--wuik-color-bg", "#ffffff");

    expect(designTokensLoaded(el)).toBe(true);
  });

  it("returns false when the probe token was never declared on the given element", () => {
    const el = document.createElement("div");

    expect(designTokensLoaded(el)).toBe(false);
  });

  it("returns false when the probe token is set but whitespace-only", () => {
    const el = document.createElement("div");
    el.style.setProperty("--wuik-color-bg", "   ");

    expect(designTokensLoaded(el)).toBe(false);
  });
});

function blankLifebarButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>(
    '[data-action="new-lifebar-blank"]',
  );
  if (!button) throw new Error("blank lifebar button not found");
  return button;
}

describe("renderApp — New Lifebar Wizard integration", () => {
  beforeEach(() => {
    resetLifebarDocumentForTests();
    resetSffSpriteSheetForTests();
  });

  it("renders the New Lifebar Wizard alongside the file input from the start", () => {
    const root = document.createElement("div");

    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    expect(blankLifebarButton(root)).not.toBeNull();
    expect(root.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("creating a blank lifebar stores it and mounts the elements editor's empty state, with no file ever loaded", () => {
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    blankLifebarButton(root).click();

    expect(getLifebarDocument()?.document.sections).toEqual([]);
    expect(getLifebarDocument()?.fileName).toBe("fight.def");
  });

  it("moves focus into the first section toggle after creating from a template", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });

    root
      .querySelector<HTMLElement>('[data-action="new-lifebar-template"]')
      ?.click();

    expect(
      document.activeElement?.className.includes(
        "elements-editor__section-toggle",
      ),
    ).toBe(true);
    root.remove();
  });

  it("prompts before discarding an edited lifebar, and does nothing when declined", () => {
    const root = document.createElement("div");
    renderApp(root, "0.1.0", { designTokensLoaded: () => true });
    root
      .querySelector<HTMLElement>('[data-action="new-lifebar-template"]')
      ?.click();
    const doc = getLifebarDocument();
    if (!doc) throw new Error("expected a document after creation");
    doc.document.sections[0].entries[0].value = "edited";
    expect(hasUnsavedLifebarChanges()).toBe(true);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    blankLifebarButton(root).click();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(getLifebarDocument()?.document.sections[0].entries[0].value).toBe(
      "edited",
    );
    confirmSpy.mockRestore();
  });
});
