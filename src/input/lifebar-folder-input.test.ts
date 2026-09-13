import { describe, expect, it } from "vitest";
import type { GatheredFile } from "./folder-entries.ts";
import {
  loadLifebarFromChosenEntry,
  loadLifebarFromFolderFiles,
  resolveCandidates,
} from "./lifebar-folder-input.ts";

function entry(relativePath: string, contents = "x"): GatheredFile {
  return {
    file: new File([contents], relativePath.split("/").pop() ?? relativePath),
    relativePath,
  };
}

describe("resolveCandidates", () => {
  it("reports no-files when the folder yielded nothing at all", () => {
    expect(resolveCandidates([])).toEqual({ status: "no-files" });
  });

  it("reports no-candidate when files exist but none is a .def file", () => {
    expect(resolveCandidates([entry("pack/font.fnt")])).toEqual({
      status: "no-candidate",
    });
  });

  it("resolves automatically when exactly one candidate is found", () => {
    const fightDef = entry("pack/fight.def");
    expect(resolveCandidates([fightDef, entry("pack/font.fnt")])).toEqual({
      status: "success",
      entry: fightDef,
    });
  });

  it("asks for a selection when multiple candidates are found", () => {
    const first = entry("pack/fight.def");
    const second = entry("pack/alt/fight2.def");
    expect(resolveCandidates([first, second])).toEqual({
      status: "needs-selection",
      candidates: [first, second],
    });
  });

  it("matches the .def extension case-insensitively", () => {
    const fightDef = entry("pack/FIGHT.DEF");
    expect(resolveCandidates([fightDef])).toEqual({
      status: "success",
      entry: fightDef,
    });
  });
});

describe("loadLifebarFromFolderFiles", () => {
  it("reads and parses the sole candidate on success", async () => {
    const fightDef = entry("pack/fight.def");

    const result = await loadLifebarFromFolderFiles([fightDef], {
      readFileText: async () => "[Info]\nname = Default\n",
    });

    expect(result).toEqual({
      status: "success",
      fileName: "fight.def",
      relativePath: "pack/fight.def",
      document: {
        sections: [
          {
            name: "Info",
            entries: [{ key: "name", value: "Default", line: 2 }],
            line: 1,
          },
        ],
      },
    });
  });

  it("passes through no-files without attempting to read anything", async () => {
    const result = await loadLifebarFromFolderFiles([], {
      readFileText: async () => {
        throw new Error("should not be called");
      },
    });

    expect(result).toEqual({ status: "no-files" });
  });

  it("passes through no-candidate without attempting to read anything", async () => {
    const result = await loadLifebarFromFolderFiles([entry("pack/font.fnt")], {
      readFileText: async () => {
        throw new Error("should not be called");
      },
    });

    expect(result).toEqual({ status: "no-candidate" });
  });

  it("passes through needs-selection without reading any candidate yet", async () => {
    const first = entry("pack/fight.def");
    const second = entry("pack/alt/fight2.def");

    const result = await loadLifebarFromFolderFiles([first, second], {
      readFileText: async () => {
        throw new Error("should not be called");
      },
    });

    expect(result).toEqual({
      status: "needs-selection",
      candidates: [first, second],
    });
  });

  it("reports a read-error naming the file that failed to read", async () => {
    const fightDef = entry("pack/fight.def");

    const result = await loadLifebarFromFolderFiles([fightDef], {
      readFileText: async () => {
        throw new Error("disk gremlin");
      },
    });

    expect(result).toEqual({
      status: "read-error",
      fileName: "fight.def",
      message: "disk gremlin",
    });
  });

  it("reports a parse-error naming the file that failed to parse", async () => {
    const fightDef = entry("pack/fight.def");

    const result = await loadLifebarFromFolderFiles([fightDef], {
      readFileText: async () => "[Info\nname = x\n",
    });

    expect(result.status).toBe("parse-error");
    if (result.status !== "parse-error")
      throw new Error("expected parse-error");
    expect(result.fileName).toBe("fight.def");
    expect(result.message).toContain("line 1");
  });
});

describe("loadLifebarFromChosenEntry", () => {
  it("reads and parses a specific entry directly, e.g. after a multi-candidate pick", async () => {
    const chosen = entry("pack/alt/fight2.def");

    const result = await loadLifebarFromChosenEntry(chosen, {
      readFileText: async () => "[Round]\npos = 1,1\n",
    });

    expect(result).toEqual({
      status: "success",
      fileName: "fight2.def",
      relativePath: "pack/alt/fight2.def",
      document: {
        sections: [
          {
            name: "Round",
            entries: [{ key: "pos", value: "1,1", line: 2 }],
            line: 1,
          },
        ],
      },
    });
  });

  it("returns a read-error for a chosen entry that fails to read", async () => {
    const chosen = entry("pack/alt/fight2.def");

    const result = await loadLifebarFromChosenEntry(chosen, {
      readFileText: async () => {
        throw new Error("simulated unreadable file");
      },
    });

    expect(result).toEqual({
      status: "read-error",
      fileName: "fight2.def",
      message: "simulated unreadable file",
    });
  });
});
