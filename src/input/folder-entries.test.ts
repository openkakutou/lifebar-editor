import { describe, expect, it } from "vitest";
import {
  filesFromDataTransferItems,
  filesFromWebkitDirectoryFiles,
} from "./folder-entries.ts";
import type {
  DirectoryEntryLike,
  EntryLike,
  FileEntryLike,
} from "./folder-entries.ts";

function fakeFile(name: string): File {
  return new File(["content"], name, { type: "text/plain" });
}

function fakeFileEntry(fullPath: string, file: File): FileEntryLike {
  return {
    isFile: true,
    isDirectory: false,
    fullPath,
    file: (success) => success(file),
  };
}

function fakeDirectoryEntry(
  fullPath: string,
  children: EntryLike[],
): DirectoryEntryLike {
  let delivered = false;
  return {
    isFile: false,
    isDirectory: true,
    fullPath,
    createReader: () => ({
      readEntries: (success) => {
        // A real FileSystemDirectoryReader must be called repeatedly and
        // eventually returns an empty array — simulated here with a
        // one-shot flag so a second call (as a correct caller must make)
        // sees the batch is exhausted.
        if (delivered) {
          success([]);
          return;
        }
        delivered = true;
        success(children);
      },
    }),
  };
}

function fakeDataTransferItem(entry: EntryLike | null) {
  return { webkitGetAsEntry: () => entry };
}

describe("filesFromWebkitDirectoryFiles", () => {
  it("derives each file's relative path from webkitRelativePath", () => {
    const file = fakeFile("fight.def");
    Object.defineProperty(file, "webkitRelativePath", {
      value: "my-lifebar/fight.def",
    });

    const result = filesFromWebkitDirectoryFiles([file]);

    expect(result).toEqual([{ file, relativePath: "my-lifebar/fight.def" }]);
  });

  it("falls back to the plain file name when webkitRelativePath is empty", () => {
    const file = fakeFile("fight.def");

    const result = filesFromWebkitDirectoryFiles([file]);

    expect(result).toEqual([{ file, relativePath: "fight.def" }]);
  });

  it("returns an empty list for an empty input", () => {
    expect(filesFromWebkitDirectoryFiles([])).toEqual([]);
  });
});

describe("filesFromDataTransferItems", () => {
  it("collects a single dropped file entry", async () => {
    const file = fakeFile("fight.def");
    const items = [fakeDataTransferItem(fakeFileEntry("/fight.def", file))];

    const result = await filesFromDataTransferItems(items);

    expect(result).toEqual([{ file, relativePath: "fight.def" }]);
  });

  it("recursively walks a directory entry, flattening nested files", async () => {
    const font = fakeFile("font.def");
    const fight = fakeFile("fight.def");
    const nested = fakeDirectoryEntry("/my-lifebar/fonts", [
      fakeFileEntry("/my-lifebar/fonts/font.def", font),
    ]);
    const root = fakeDirectoryEntry("/my-lifebar", [
      fakeFileEntry("/my-lifebar/fight.def", fight),
      nested,
    ]);
    const items = [fakeDataTransferItem(root)];

    const result = await filesFromDataTransferItems(items);

    expect(result).toEqual(
      expect.arrayContaining([
        { file: fight, relativePath: "my-lifebar/fight.def" },
        { file: font, relativePath: "my-lifebar/fonts/font.def" },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it("skips an item that yields no entry (e.g. a non-file drag source)", async () => {
    const result = await filesFromDataTransferItems([
      fakeDataTransferItem(null),
    ]);

    expect(result).toEqual([]);
  });

  it("returns an empty list when nothing was dropped", async () => {
    expect(await filesFromDataTransferItems([])).toEqual([]);
  });
});
