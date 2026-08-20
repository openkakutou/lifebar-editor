import { afterEach, describe, expect, it, vi } from "vitest";
import type { LifebarDocument } from "../lifebar/document.ts";
import type { SpriteGroup } from "../wasm/types.ts";
import { renderElementsEditor } from "./elements-editor.ts";

function doc(sections: LifebarDocument["sections"]): LifebarDocument {
  return { sections };
}

function spriteGroups(): SpriteGroup[] {
  return [
    {
      index: 9000,
      sprites: [
        {
          group: 9000,
          image: 0,
          width: 32,
          height: 32,
          axisX: 16,
          axisY: 32,
          palette: 0,
        },
        {
          group: 9000,
          image: 1,
          width: 32,
          height: 32,
          axisX: 16,
          axisY: 32,
          palette: 0,
        },
      ],
    },
  ];
}

function toggles(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll(".elements-editor__section-toggle"));
}

function entriesFor(root: HTMLElement, sectionIndex: number): HTMLElement {
  return root.querySelectorAll(".elements-editor__entries")[
    sectionIndex
  ] as HTMLElement;
}

describe("renderElementsEditor", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when no lifebar document is loaded", () => {
    const root = document.createElement("div");
    renderElementsEditor(root, null, null);
    expect(root.children.length).toBe(0);
  });

  it("shows an empty state when the document has no sections", () => {
    const root = document.createElement("div");
    renderElementsEditor(root, doc([]), null);
    expect(root.textContent).toMatch(/no elements/i);
  });

  it("lists every section as a collapsed toggle", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        { name: "Life Bar 0", entries: [], line: 1 },
        { name: "Power Bar 0", entries: [], line: 10 },
      ]),
      null,
    );

    const t = toggles(root);
    expect(t.map((b) => b.getAttribute("aria-expanded"))).toEqual([
      "false",
      "false",
    ]);
    expect(root.textContent).toContain("Life Bar 0");
    expect(root.textContent).toContain("Power Bar 0");
  });

  it("expanding a section's toggle reveals its entries", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        {
          name: "Round",
          entries: [{ key: "pos", value: "160,20", line: 2 }],
          line: 1,
        },
      ]),
      null,
    );

    const toggle = toggles(root)[0];
    expect(entriesFor(root, 0).hidden).toBe(true);
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(entriesFor(root, 0).hidden).toBe(false);
    expect(entriesFor(root, 0).textContent).toContain("pos");
  });

  it("shows a message instead of an entries list for a section with none", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([{ name: "Empty", entries: [], line: 1 }]),
      null,
    );
    toggles(root)[0].click();
    expect(entriesFor(root, 0).textContent).toMatch(/no properties/i);
  });

  it("commits a plain entry's edited value to the document on blur", () => {
    const document_ = doc([
      {
        name: "Round",
        entries: [{ key: "pos", value: "160,20", line: 2 }],
        line: 1,
      },
    ]);
    const onEntryChange = vi.fn();
    const root = document.createElement("div");
    renderElementsEditor(root, document_, null, { onEntryChange });
    toggles(root)[0].click();

    const input = entriesFor(root, 0).querySelector(
      "input[type=text]",
    ) as HTMLInputElement;
    input.value = "170,25";
    input.dispatchEvent(new Event("blur"));

    expect(document_.sections[0].entries[0].value).toBe("170,25");
    expect(onEntryChange).toHaveBeenCalledWith(0, 0, "170,25");
  });

  it("does not fire a change when a plain entry is blurred unchanged", () => {
    const document_ = doc([
      {
        name: "Round",
        entries: [{ key: "pos", value: "160,20", line: 2 }],
        line: 1,
      },
    ]);
    const onEntryChange = vi.fn();
    const root = document.createElement("div");
    renderElementsEditor(root, document_, null, { onEntryChange });
    toggles(root)[0].click();

    const input = entriesFor(root, 0).querySelector(
      "input[type=text]",
    ) as HTMLInputElement;
    input.dispatchEvent(new Event("blur"));

    expect(onEntryChange).not.toHaveBeenCalled();
  });

  it("shows one load-a-sprite-sheet prompt per section, not per .spr entry, when no sheet is loaded", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        {
          name: "Life Bar 0",
          entries: [
            { key: "p1.bg0.spr", value: "9000, 0", line: 2 },
            { key: "p1.bg1.spr", value: "9000, 1", line: 3 },
          ],
          line: 1,
        },
      ]),
      null,
    );
    toggles(root)[0].click();

    const prompts = entriesFor(root, 0).querySelectorAll(
      ".elements-editor__sprite-prompt",
    );
    expect(prompts.length).toBe(1);
    // The raw value is still shown, read-only, for both .spr entries.
    expect(entriesFor(root, 0).textContent).toContain("9000, 0");
    expect(entriesFor(root, 0).textContent).toContain("9000, 1");
    // No <select> is offered while there is nothing to pick from.
    expect(entriesFor(root, 0).querySelector("select")).toBeNull();
  });

  it("flags a section with a .spr entry and no loaded sheet on its (collapsed) header", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        {
          name: "Life Bar 0",
          entries: [{ key: "p1.bg0.spr", value: "9000, 0", line: 2 }],
          line: 1,
        },
      ]),
      null,
    );
    const toggle = toggles(root)[0];
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      toggle.querySelector(".elements-editor__section-badge"),
    ).not.toBeNull();
  });

  it("does not flag a section with no .spr entries even without a loaded sheet", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        {
          name: "Round",
          entries: [{ key: "pos", value: "1,2", line: 2 }],
          line: 1,
        },
      ]),
      null,
    );
    expect(
      toggles(root)[0].querySelector(".elements-editor__section-badge"),
    ).toBeNull();
  });

  it("shows a select pre-selected to the matching sprite for a valid .spr value", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        {
          name: "Life Bar 0",
          entries: [{ key: "p1.bg0.spr", value: "9000, 1", line: 2 }],
          line: 1,
        },
      ]),
      spriteGroups(),
    );
    toggles(root)[0].click();

    const select = entriesFor(root, 0).querySelector(
      "select",
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("9000,1");
    expect(
      entriesFor(root, 0).querySelector(".elements-editor__sprite-error"),
    ).toBeNull();
  });

  it("shows an explicit invalid placeholder and an inline error for a bad sprite reference", () => {
    const root = document.createElement("div");
    renderElementsEditor(
      root,
      doc([
        {
          name: "Life Bar 0",
          entries: [{ key: "p1.bg0.spr", value: "9000, 99", line: 2 }],
          line: 1,
        },
      ]),
      spriteGroups(),
    );
    toggles(root)[0].click();

    const select = entriesFor(root, 0).querySelector(
      "select",
    ) as HTMLSelectElement;
    // Never silently falls back to the browser's default first real option.
    expect(select.value).toBe("");
    expect(select.selectedOptions[0].textContent).toMatch(/invalid/i);
    const error = entriesFor(root, 0).querySelector(
      ".elements-editor__sprite-error",
    );
    expect(error).not.toBeNull();
    expect(error?.textContent).toContain("9000, 99");
  });

  it("does not corrupt an invalid .spr value until the user explicitly picks a replacement", () => {
    const document_ = doc([
      {
        name: "Life Bar 0",
        entries: [{ key: "p1.bg0.spr", value: "9000, 99", line: 2 }],
        line: 1,
      },
    ]);
    const onEntryChange = vi.fn();
    const root = document.createElement("div");
    renderElementsEditor(root, document_, spriteGroups(), { onEntryChange });
    toggles(root)[0].click();

    // Nothing touches the model just from rendering the invalid state.
    expect(document_.sections[0].entries[0].value).toBe("9000, 99");
    expect(onEntryChange).not.toHaveBeenCalled();
  });

  it("updates the document when a new sprite is chosen from the select", () => {
    const document_ = doc([
      {
        name: "Life Bar 0",
        entries: [{ key: "p1.bg0.spr", value: "", line: 2 }],
        line: 1,
      },
    ]);
    const onEntryChange = vi.fn();
    const root = document.createElement("div");
    renderElementsEditor(root, document_, spriteGroups(), { onEntryChange });
    toggles(root)[0].click();

    const select = entriesFor(root, 0).querySelector(
      "select",
    ) as HTMLSelectElement;
    select.value = "9000,1";
    select.dispatchEvent(new Event("change"));

    expect(document_.sections[0].entries[0].value).toBe("9000, 1");
    expect(onEntryChange).toHaveBeenCalledWith(0, 0, "9000, 1");
  });

  it("keeps a section expanded across a re-render, so a newly loaded sheet appears live without re-navigating", () => {
    const document_ = doc([
      {
        name: "Life Bar 0",
        entries: [{ key: "p1.bg0.spr", value: "9000, 0", line: 2 }],
        line: 1,
      },
    ]);
    const expandedSections = new Set<number>();
    const root = document.createElement("div");

    renderElementsEditor(root, document_, null, { expandedSections });
    toggles(root)[0].click(); // user expands it while no sheet is loaded
    expect(entriesFor(root, 0).querySelector("select")).toBeNull();

    // A sprite sheet finishes loading; the caller re-renders with the same
    // expandedSections instance.
    renderElementsEditor(root, document_, spriteGroups(), { expandedSections });

    expect(toggles(root)[0].getAttribute("aria-expanded")).toBe("true");
    expect(entriesFor(root, 0).hidden).toBe(false);
    const select = entriesFor(root, 0).querySelector(
      "select",
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("9000,0");
  });
});
