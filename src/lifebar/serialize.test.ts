import { describe, expect, it } from "vitest";
import type { LifebarDocument, LifebarSection } from "./document.ts";
import { parseLifebar } from "./parse.ts";
import { serializeLifebar } from "./serialize.ts";

/** Strips source `line` numbers so a round-tripped parse (whose lines
 * necessarily differ from the original's, since the serialized text has a
 * different blank-line layout) can be compared against the original parse
 * for structural (name/key/value/order) equivalence only. */
function withoutLines(sections: LifebarSection[]) {
  return sections.map((s) => ({
    name: s.name,
    entries: s.entries.map((e) => ({ key: e.key, value: e.value })),
  }));
}

describe("serializeLifebar", () => {
  it("writes a section as a bracketed header followed by its key = value entries", () => {
    const document: LifebarDocument = {
      sections: [
        {
          name: "Info",
          line: 1,
          entries: [
            { key: "name", value: "Default", line: 2 },
            { key: "author", value: "Elecbyte", line: 3 },
          ],
        },
      ],
    };

    expect(serializeLifebar(document)).toBe(
      "[Info]\nname = Default\nauthor = Elecbyte\n",
    );
  });

  it("separates multiple sections with a blank line", () => {
    const document: LifebarDocument = {
      sections: [
        {
          name: "Info",
          line: 1,
          entries: [{ key: "name", value: "Default", line: 2 }],
        },
        {
          name: "Life Bar 0",
          line: 3,
          entries: [{ key: "pos", value: "6,17", line: 4 }],
        },
      ],
    };

    expect(serializeLifebar(document)).toBe(
      "[Info]\nname = Default\n\n[Life Bar 0]\npos = 6,17\n",
    );
  });

  it("returns an empty string for a document with no sections", () => {
    expect(serializeLifebar({ sections: [] })).toBe("");
  });

  it("writes a section with no entries as just its header line", () => {
    const document: LifebarDocument = {
      sections: [{ name: "Empty Section", line: 1, entries: [] }],
    };

    expect(serializeLifebar(document)).toBe("[Empty Section]\n");
  });

  it("keeps duplicate section names and repeated keys as separate lines, in order, never merged", () => {
    const document: LifebarDocument = {
      sections: [
        {
          name: "Life Bar 0",
          line: 1,
          entries: [{ key: "pos", value: "1,1", line: 2 }],
        },
        {
          name: "Life Bar 0",
          line: 3,
          entries: [
            { key: "pos", value: "2,2", line: 4 },
            { key: "pos", value: "3,3", line: 5 },
          ],
        },
      ],
    };

    expect(serializeLifebar(document)).toBe(
      "[Life Bar 0]\npos = 1,1\n\n[Life Bar 0]\npos = 2,2\npos = 3,3\n",
    );
  });

  it("round-trips a comment-free, irregularly-spaced file through parse -> serialize -> parse into an equivalent document", () => {
    const original = [
      "[Info]",
      "name = Default",
      "author = Elecbyte",
      "",
      "[Life Bar 0]",
      "pos = 6,17",
      "range.x = 0, 158",
      "",
      "[Life Bar 0]",
      "pos = 1,1",
    ].join("\n");

    const firstParse = parseLifebar(original);
    if (firstParse.status !== "success") throw new Error("expected success");

    const roundTripped = parseLifebar(serializeLifebar(firstParse.document));
    if (roundTripped.status !== "success") throw new Error("expected success");

    expect(withoutLines(roundTripped.document.sections)).toEqual(
      withoutLines(firstParse.document.sections),
    );
  });

  it("drops comments on round trip (out of scope: the parser never retains them) rather than crashing or corrupting surrounding entries", () => {
    const original = [
      "; a whole-line comment",
      "[Round]",
      "pos = 160,80 ; trailing comment",
    ].join("\n");

    const firstParse = parseLifebar(original);
    if (firstParse.status !== "success") throw new Error("expected success");

    const roundTripped = parseLifebar(serializeLifebar(firstParse.document));
    if (roundTripped.status !== "success") throw new Error("expected success");

    expect(withoutLines(roundTripped.document.sections)).toEqual([
      { name: "Round", entries: [{ key: "pos", value: "160,80" }] },
    ]);
  });

  it("round-trips an empty value and an empty section name unchanged", () => {
    const document: LifebarDocument = {
      sections: [
        { name: "", line: 1, entries: [{ key: "pos", value: "", line: 2 }] },
      ],
    };

    const roundTripped = parseLifebar(serializeLifebar(document));
    if (roundTripped.status !== "success") throw new Error("expected success");

    expect(withoutLines(roundTripped.document.sections)).toEqual(
      withoutLines(document.sections),
    );
  });
});
