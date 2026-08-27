import { describe, expect, it, vi } from "vitest";
import type { LifebarEditorDocument } from "../document/lifebar-document-store.ts";
import type { SffSpriteSheetDocument } from "../document/sff-sprite-sheet-store.ts";
import type { LifebarDocument } from "../lifebar/document.ts";
import type { ExportProblem } from "./export-validation.ts";
import { renderSaveExport } from "./save-export.ts";

function lifebarDocument(
  overrides: Partial<LifebarEditorDocument> = {},
): LifebarEditorDocument {
  const document: LifebarDocument = {
    sections: [
      {
        name: "Info",
        line: 1,
        entries: [{ key: "name", value: "x", line: 2 }],
      },
    ],
  };
  return { fileName: "fight.def", document, ...overrides };
}

function click(root: HTMLElement, selector: string): void {
  root
    .querySelector<HTMLElement>(selector)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("renderSaveExport", () => {
  it("renders a save button and an empty status", () => {
    const root = document.createElement("div");

    renderSaveExport(root, { getLifebarDocument: () => lifebarDocument() });

    expect(root.querySelector('[data-action="save-export"]')).not.toBeNull();
    expect(root.querySelector(".save-export__status")?.textContent).toBe("");
  });

  it("serializes the current document and triggers a download with the original filename, when there are no problems", () => {
    const root = document.createElement("div");
    const doc = lifebarDocument({ fileName: "arena.def" });
    const serializeLifebar = vi.fn().mockReturnValue("[Info]\nname = x\n");
    const findExportProblems = vi.fn().mockReturnValue([] as ExportProblem[]);
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getLifebarDocument: () => doc,
      getSffSpriteSheet: () => null,
      serializeLifebar,
      findExportProblems,
      triggerDownload,
    });

    click(root, '[data-action="save-export"]');

    expect(serializeLifebar).toHaveBeenCalledWith(doc.document);
    expect(triggerDownload).toHaveBeenCalledWith(
      "[Info]\nname = x\n",
      "arena.def",
    );
    expect(root.querySelector(".save-export__status")?.textContent).toMatch(
      /saved arena\.def/i,
    );
  });

  it("does nothing when clicked with no lifebar loaded", () => {
    const root = document.createElement("div");
    const serializeLifebar = vi.fn();
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getLifebarDocument: () => null,
      serializeLifebar,
      triggerDownload,
    });

    click(root, '[data-action="save-export"]');

    expect(serializeLifebar).not.toHaveBeenCalled();
    expect(triggerDownload).not.toHaveBeenCalled();
  });

  it("shows a blocking error and never downloads when a problem is blocking, with no override offered", () => {
    const root = document.createElement("div");
    const findExportProblems = vi.fn().mockReturnValue([
      {
        sectionName: "Info",
        message: 'contains a ";"',
        severity: "blocking",
      },
    ] as ExportProblem[]);
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getLifebarDocument: () => lifebarDocument(),
      findExportProblems,
      triggerDownload,
    });

    click(root, '[data-action="save-export"]');

    expect(triggerDownload).not.toHaveBeenCalled();
    expect(root.querySelector(".save-export__status")?.textContent).toContain(
      'contains a ";"',
    );
    expect(root.querySelector('[data-action="export-anyway"]')).toBeNull();
  });

  it("shows a warning with an 'export anyway' action when a problem is only a warning, and does not download yet", () => {
    const root = document.createElement("div");
    const findExportProblems = vi.fn().mockReturnValue([
      {
        sectionName: "Info",
        message: "does not match any sprite",
        severity: "warning",
      },
    ] as ExportProblem[]);
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getLifebarDocument: () => lifebarDocument(),
      findExportProblems,
      triggerDownload,
    });

    click(root, '[data-action="save-export"]');

    expect(triggerDownload).not.toHaveBeenCalled();
    expect(root.querySelector(".save-export__status")?.textContent).toContain(
      "does not match any sprite",
    );
    expect(root.querySelector('[data-action="export-anyway"]')).not.toBeNull();
  });

  it("exports despite the warning once 'export anyway' is clicked", () => {
    const root = document.createElement("div");
    const doc = lifebarDocument({ fileName: "arena.def" });
    const serializeLifebar = vi.fn().mockReturnValue("[Info]\nname = x\n");
    const findExportProblems = vi
      .fn()
      .mockReturnValue([
        { sectionName: "Info", message: "unresolved", severity: "warning" },
      ] as ExportProblem[]);
    const triggerDownload = vi.fn();

    renderSaveExport(root, {
      getLifebarDocument: () => doc,
      serializeLifebar,
      findExportProblems,
      triggerDownload,
    });

    click(root, '[data-action="save-export"]');
    click(root, '[data-action="export-anyway"]');

    expect(triggerDownload).toHaveBeenCalledWith(
      "[Info]\nname = x\n",
      "arena.def",
    );
    expect(root.querySelector(".save-export__status")?.textContent).toMatch(
      /saved arena\.def/i,
    );
  });

  it("reads the sprite sheet's spriteGroups when checking problems, defaulting to null when none is loaded", () => {
    const root = document.createElement("div");
    const sheet: SffSpriteSheetDocument = {
      fileName: "sheet.sff",
      sffBytes: new Uint8Array(),
      spriteGroups: [],
    };
    const findExportProblems = vi.fn().mockReturnValue([] as ExportProblem[]);

    renderSaveExport(root, {
      getLifebarDocument: () => lifebarDocument(),
      getSffSpriteSheet: () => sheet,
      findExportProblems,
      serializeLifebar: () => "",
      triggerDownload: () => {},
    });

    click(root, '[data-action="save-export"]');

    expect(findExportProblems).toHaveBeenCalledWith(
      lifebarDocument().document,
      sheet.spriteGroups,
    );
  });
});
