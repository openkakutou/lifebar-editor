import { beforeEach, describe, expect, it } from "vitest";
import type { LifebarDocument } from "../lifebar/document.ts";
import {
  getLifebarDocument,
  hasUnsavedLifebarChanges,
  markLifebarDocumentSaved,
  resetLifebarDocumentForTests,
  setLifebarDocument,
} from "./lifebar-document-store.ts";

function emptyDocument(): LifebarDocument {
  return { sections: [] };
}

beforeEach(() => {
  resetLifebarDocumentForTests();
});

describe("getLifebarDocument", () => {
  it("is null before any file has been loaded", () => {
    expect(getLifebarDocument()).toBeNull();
  });
});

describe("setLifebarDocument / getLifebarDocument", () => {
  it("returns the exact document and file name just set", () => {
    const document = emptyDocument();

    setLifebarDocument({ fileName: "fight.def", document });

    expect(getLifebarDocument()).toEqual({ fileName: "fight.def", document });
  });

  it("replaces a previously loaded document rather than merging into it", () => {
    setLifebarDocument({ fileName: "first.def", document: emptyDocument() });
    setLifebarDocument({ fileName: "second.def", document: emptyDocument() });

    expect(getLifebarDocument()?.fileName).toBe("second.def");
  });

  it("clears the document when set back to null", () => {
    setLifebarDocument({ fileName: "fight.def", document: emptyDocument() });

    setLifebarDocument(null);

    expect(getLifebarDocument()).toBeNull();
  });
});

describe("hasUnsavedLifebarChanges", () => {
  it("is false when nothing is loaded", () => {
    expect(hasUnsavedLifebarChanges()).toBe(false);
  });

  it("is false right after loading a document", () => {
    setLifebarDocument({ fileName: "fight.def", document: emptyDocument() });

    expect(hasUnsavedLifebarChanges()).toBe(false);
  });

  it("is true once the loaded document's own object is mutated in place", () => {
    const document = emptyDocument();
    setLifebarDocument({ fileName: "fight.def", document });

    document.sections.push({ name: "Life Bar 0", entries: [], line: 1 });

    expect(hasUnsavedLifebarChanges()).toBe(true);
  });

  it("is false again once an edit is reverted back to its original value", () => {
    const document: LifebarDocument = {
      sections: [
        {
          name: "Life Bar 0",
          entries: [{ key: "pos", value: "0, 0", line: 2 }],
          line: 1,
        },
      ],
    };
    setLifebarDocument({ fileName: "fight.def", document });

    document.sections[0].entries[0].value = "5, 5";
    expect(hasUnsavedLifebarChanges()).toBe(true);

    document.sections[0].entries[0].value = "0, 0";
    expect(hasUnsavedLifebarChanges()).toBe(false);
  });

  it("is false again after markLifebarDocumentSaved, without needing to reload", () => {
    const document = emptyDocument();
    setLifebarDocument({ fileName: "fight.def", document });
    document.sections.push({ name: "Life Bar 0", entries: [], line: 1 });
    expect(hasUnsavedLifebarChanges()).toBe(true);

    markLifebarDocumentSaved();

    expect(hasUnsavedLifebarChanges()).toBe(false);
  });

  it("is false once nothing is loaded, even after markLifebarDocumentSaved is called with a stale reference", () => {
    setLifebarDocument({ fileName: "fight.def", document: emptyDocument() });
    setLifebarDocument(null);

    markLifebarDocumentSaved();

    expect(hasUnsavedLifebarChanges()).toBe(false);
  });
});
