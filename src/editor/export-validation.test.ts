import { describe, expect, it } from "vitest";
import type { LifebarDocument } from "../lifebar/document.ts";
import type { SpriteGroup } from "../wasm/types.ts";
import { findExportProblems } from "./export-validation.ts";

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
      ],
    },
  ];
}

function documentWith(
  entries: { key: string; value: string }[],
): LifebarDocument {
  return {
    sections: [
      {
        name: "Life Bar 0",
        line: 1,
        entries: entries.map((e, i) => ({ ...e, line: i + 2 })),
      },
    ],
  };
}

describe("findExportProblems", () => {
  it("returns no problems for a document with only plain entries and no sprite references", () => {
    const document = documentWith([{ key: "pos", value: "6,17" }]);

    expect(findExportProblems(document, null)).toEqual([]);
  });

  it("returns no problems for a valid sprite reference against a loaded sheet", () => {
    const document = documentWith([{ key: "p1.bg0.spr", value: "9000, 0" }]);

    expect(findExportProblems(document, spriteGroups())).toEqual([]);
  });

  it("does not flag an unset (empty) sprite reference -- that is a normal, not-yet-assigned state", () => {
    const document = documentWith([{ key: "p1.bg0.spr", value: "" }]);

    expect(findExportProblems(document, spriteGroups())).toEqual([]);
  });

  it("flags a semicolon in any entry value as blocking, regardless of key", () => {
    const document = documentWith([{ key: "displayname", value: "Nice; try" }]);

    const problems = findExportProblems(document, null);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      sectionName: "Life Bar 0",
      severity: "blocking",
    });
    expect(problems[0].message).toContain("displayname");
  });

  it("flags an invalid sprite reference (well-formed but unresolvable) as a warning", () => {
    const document = documentWith([{ key: "p1.bg0.spr", value: "9000, 99" }]);

    const problems = findExportProblems(document, spriteGroups());

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      sectionName: "Life Bar 0",
      severity: "warning",
    });
    expect(problems[0].message).toContain("p1.bg0.spr");
  });

  it("flags a sprite reference as a warning when no sheet is loaded at all, with distinct wording from an invalid reference", () => {
    const document = documentWith([{ key: "p1.bg0.spr", value: "9000, 0" }]);

    const problems = findExportProblems(document, null);

    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe("warning");
    expect(problems[0].message).toMatch(/load a sprite sheet/i);
  });

  it("reports one problem per offending entry, across sections, in document order", () => {
    const document: LifebarDocument = {
      sections: [
        {
          name: "Info",
          line: 1,
          entries: [{ key: "author", value: "a; b", line: 2 }],
        },
        {
          name: "Life Bar 0",
          line: 3,
          entries: [{ key: "p1.bg0.spr", value: "9000, 99", line: 4 }],
        },
      ],
    };

    const problems = findExportProblems(document, spriteGroups());

    expect(problems.map((p) => p.sectionName)).toEqual(["Info", "Life Bar 0"]);
    expect(problems.map((p) => p.severity)).toEqual(["blocking", "warning"]);
  });
});
