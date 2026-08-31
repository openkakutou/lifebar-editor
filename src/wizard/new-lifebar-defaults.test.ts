import { describe, expect, it } from "vitest";
import {
  LIFEBAR_TEMPLATES,
  createBlankLifebar,
} from "./new-lifebar-defaults.ts";

describe("createBlankLifebar", () => {
  it("starts with no sections at all", () => {
    expect(createBlankLifebar()).toEqual({ sections: [] });
  });

  it("returns a fresh, independently-mutable document every call", () => {
    const a = createBlankLifebar();
    const b = createBlankLifebar();

    a.sections.push({ name: "Life Bar 0", entries: [], line: 1 });

    expect(b.sections).toEqual([]);
  });
});

describe("LIFEBAR_TEMPLATES", () => {
  it("offers at least one starter template", () => {
    expect(LIFEBAR_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("each template has a unique id and a human-readable label", () => {
    const ids = LIFEBAR_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of LIFEBAR_TEMPLATES) {
      expect(template.label.length).toBeGreaterThan(0);
    }
  });

  it("builds a document with at least one section", () => {
    for (const template of LIFEBAR_TEMPLATES) {
      expect(template.build().sections.length).toBeGreaterThan(0);
    }
  });

  it("leaves every sprite-reference entry unset (empty value), never a fabricated group/image pair", () => {
    for (const template of LIFEBAR_TEMPLATES) {
      const doc = template.build();
      for (const section of doc.sections) {
        for (const entry of section.entries) {
          if (entry.key.toLowerCase().endsWith(".spr")) {
            expect(entry.value).toBe("");
          }
        }
      }
    }
  });

  it("build() returns a fresh, independently-mutable document every call", () => {
    const template = LIFEBAR_TEMPLATES[0];
    const a = template.build();
    const b = template.build();

    a.sections[0].entries.push({ key: "extra", value: "x", line: 99 });

    expect(b.sections[0].entries).not.toEqual(a.sections[0].entries);
  });
});
