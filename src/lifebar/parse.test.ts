import { describe, expect, it } from "vitest";
import { entriesNamed, parseLifebar, sectionsNamed } from "./parse.ts";

describe("parseLifebar", () => {
  it("parses a well-formed lifebar file into one section per header, in file order", () => {
    const text = [
      "[Info]",
      "name = Default",
      "author = Elecbyte",
      "",
      "[Life Bar 0]",
      "pos = 6,17",
      "range.x = 0, 158",
    ].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections.map((s) => s.name)).toEqual([
      "Info",
      "Life Bar 0",
    ]);
    expect(result.document.sections[0].entries).toEqual([
      { key: "name", value: "Default", line: 2 },
      { key: "author", value: "Elecbyte", line: 3 },
    ]);
    expect(result.document.sections[1].entries).toEqual([
      { key: "pos", value: "6,17", line: 6 },
      { key: "range.x", value: "0, 158", line: 7 },
    ]);
  });

  it("strips whole-line and trailing comments and skips blank lines", () => {
    const text = [
      "; a whole-line comment",
      "[Round]",
      "pos = 160,80 ; trailing comment",
      "",
      "  ",
    ].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections[0].entries).toEqual([
      { key: "pos", value: "160,80", line: 3 },
    ]);
  });

  it("returns an explicit empty document, not an error, for empty input", () => {
    const result = parseLifebar("");

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections).toEqual([]);
  });

  it("keeps two sections with the same name as distinct entries, not merged", () => {
    const text = [
      "[Life Bar 0]",
      "pos = 1,1",
      "[Life Bar 0]",
      "pos = 2,2",
    ].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections).toHaveLength(2);
    expect(result.document.sections[0].entries[0].value).toBe("1,1");
    expect(result.document.sections[1].entries[0].value).toBe("2,2");
  });

  it("keeps a key repeated within one section as distinct entries, not last-write-wins", () => {
    const text = ["[Power Bar 0]", "pos = 1,1", "pos = 2,2"].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections[0].entries).toEqual([
      { key: "pos", value: "1,1", line: 2 },
      { key: "pos", value: "2,2", line: 3 },
    ]);
  });

  it("preserves an Ikemen GO-only section and key it has never heard of, unchanged", () => {
    const text = [
      "[Guard Bar 0]",
      "pos = 6,30",
      "ikemen.guardbar.color = 255,0,0",
    ].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections[0].name).toBe("Guard Bar 0");
    expect(result.document.sections[0].entries[1]).toEqual({
      key: "ikemen.guardbar.color",
      value: "255,0,0",
      line: 3,
    });
  });

  it("returns a line-numbered error for an unclosed section header", () => {
    const text = ["[Info]", "name = Default", "[Life Bar 0", "pos = 1,1"].join(
      "\n",
    );

    const result = parseLifebar(text);

    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.message).toContain("line 3");
  });

  it("returns a line-numbered error for content that is neither a header nor a key = value pair", () => {
    const text = ["[Info]", "this is not a valid line"].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.message).toContain("line 2");
  });

  it("returns a line-numbered error for content appearing before any section", () => {
    const text = ["stray = content", "[Info]", "name = Default"].join("\n");

    const result = parseLifebar(text);

    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.message).toContain("line 1");
  });
});

describe("sectionsNamed", () => {
  it("finds a section case-insensitively", () => {
    const result = parseLifebar("[Life Bar 0]\npos = 1,1");
    if (result.status !== "success") throw new Error("expected success");

    expect(sectionsNamed(result.document, "life bar 0")).toHaveLength(1);
    expect(sectionsNamed(result.document, "LIFE BAR 0")).toHaveLength(1);
  });

  it("returns every match when a section name repeats", () => {
    const result = parseLifebar(
      "[Life Bar 0]\npos = 1,1\n[Life Bar 0]\npos = 2,2",
    );
    if (result.status !== "success") throw new Error("expected success");

    expect(sectionsNamed(result.document, "Life Bar 0")).toHaveLength(2);
  });

  it("returns an empty array for a name with no match", () => {
    const result = parseLifebar("[Life Bar 0]\npos = 1,1");
    if (result.status !== "success") throw new Error("expected success");

    expect(sectionsNamed(result.document, "Power Bar 0")).toEqual([]);
  });
});

describe("entriesNamed", () => {
  it("finds an entry case-insensitively and returns every duplicate", () => {
    const result = parseLifebar("[Life Bar 0]\nPOS = 1,1\npos = 2,2");
    if (result.status !== "success") throw new Error("expected success");

    const entries = entriesNamed(result.document.sections[0], "pos");
    expect(entries.map((e) => e.value)).toEqual(["1,1", "2,2"]);
  });
});
