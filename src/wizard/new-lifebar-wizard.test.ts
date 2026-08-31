import { describe, expect, it, vi } from "vitest";
import type { LifebarEditorDocument } from "../document/lifebar-document-store.ts";
import { renderNewLifebarWizard } from "./new-lifebar-wizard.ts";

function blankButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>(
    '[data-action="new-lifebar-blank"]',
  );
  if (!button) throw new Error("blank lifebar button not found");
  return button;
}

function templateButton(root: HTMLElement): HTMLElement {
  const button = root.querySelector<HTMLElement>(
    '[data-action="new-lifebar-template"]',
  );
  if (!button) throw new Error("template button not found");
  return button;
}

describe("renderNewLifebarWizard", () => {
  it("renders a Blank Lifebar button and at least one named template button", () => {
    const root = document.createElement("div");

    renderNewLifebarWizard(root, { onCreated: vi.fn() });

    expect(blankButton(root)).not.toBeNull();
    const template = templateButton(root);
    expect(template.textContent?.length).toBeGreaterThan(0);
  });

  it("is visually distinct from the file-load control — its own section heading", () => {
    const root = document.createElement("div");

    renderNewLifebarWizard(root, { onCreated: vi.fn() });

    expect(root.textContent).toMatch(/new lifebar/i);
  });

  it("creates a blank lifebar immediately when nothing is loaded, with no confirm prompt", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();
    const confirmDiscard = vi.fn();

    renderNewLifebarWizard(root, {
      onCreated,
      hasUnsavedChanges: () => false,
      confirmDiscard,
    });
    blankButton(root).click();

    expect(confirmDiscard).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledOnce();
    const created = onCreated.mock.calls[0]?.[0] as LifebarEditorDocument;
    expect(created.document.sections).toEqual([]);
    expect(created.fileName).toBe("fight.def");
  });

  it("creates the template's lifebar when its button is clicked, with no confirm prompt when nothing is dirty", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();

    renderNewLifebarWizard(root, {
      onCreated,
      hasUnsavedChanges: () => false,
      confirmDiscard: vi.fn(),
    });
    templateButton(root).click();

    expect(onCreated).toHaveBeenCalledOnce();
    const created = onCreated.mock.calls[0]?.[0] as LifebarEditorDocument;
    expect(created.document.sections.length).toBeGreaterThan(0);
  });

  it("asks for confirmation, naming the consequence, before discarding unsaved changes", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();
    const confirmDiscard = vi.fn().mockReturnValue(true);

    renderNewLifebarWizard(root, {
      onCreated,
      hasUnsavedChanges: () => true,
      confirmDiscard,
    });
    blankButton(root).click();

    expect(confirmDiscard).toHaveBeenCalledOnce();
    expect(confirmDiscard.mock.calls[0]?.[0]).toMatch(/discard/i);
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it("never creates a new lifebar, and leaves nothing changed, when the user declines to discard", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();

    renderNewLifebarWizard(root, {
      onCreated,
      hasUnsavedChanges: () => true,
      confirmDiscard: () => false,
    });
    blankButton(root).click();
    templateButton(root).click();

    expect(onCreated).not.toHaveBeenCalled();
  });

  it("builds a fresh document on each click, independent of any previously created one", () => {
    const root = document.createElement("div");
    const onCreated = vi.fn();

    renderNewLifebarWizard(root, {
      onCreated,
      hasUnsavedChanges: () => false,
      confirmDiscard: vi.fn(),
    });
    templateButton(root).click();
    templateButton(root).click();

    const [first, second] = onCreated.mock.calls.map(
      (c) => c[0] as LifebarEditorDocument,
    );
    first.document.sections[0].entries.push({
      key: "extra",
      value: "x",
      line: 99,
    });
    expect(second.document.sections[0].entries).not.toEqual(
      first.document.sections[0].entries,
    );
  });
});
