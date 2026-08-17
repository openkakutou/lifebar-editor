import { beforeEach, describe, expect, it } from "vitest";
import type { LifebarDocument } from "../lifebar/document.ts";
import {
  getLifebarDocument,
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
