import { describe, expect, it } from "vitest";
import { loadSpriteSheetFromFile } from "./sprite-sheet-input.ts";

function makeFile(name: string, contents = "x"): File {
  return new File([contents], name);
}

describe("loadSpriteSheetFromFile", () => {
  it("reads the file, loads it via the bridge, and returns typed sprite groups on success", async () => {
    const file = makeFile("cyclops.sff");
    const spriteGroups = [{ index: 0, sprites: [] }];

    const result = await loadSpriteSheetFromFile(file, {
      readFileBytes: async () => new Uint8Array([1, 2, 3]),
      loadSpriteSheet: async () => ({ ok: true, spriteGroups }),
    });

    expect(result).toEqual({
      status: "success",
      fileName: "cyclops.sff",
      sffBytes: new Uint8Array([1, 2, 3]),
      spriteGroups,
    });
  });

  it("reports a read-error naming the file when reading its bytes fails", async () => {
    const file = makeFile("cyclops.sff");

    const result = await loadSpriteSheetFromFile(file, {
      readFileBytes: async () => {
        throw new Error("disk gremlin");
      },
      loadSpriteSheet: async () => {
        throw new Error("should not be called");
      },
    });

    expect(result).toEqual({
      status: "read-error",
      fileName: "cyclops.sff",
      message: "disk gremlin",
    });
  });

  it("reports a setup-error when bringing up the WASM module itself fails (e.g. assets not downloaded)", async () => {
    const file = makeFile("cyclops.sff");

    const result = await loadSpriteSheetFromFile(file, {
      readFileBytes: async () => new Uint8Array([1]),
      loadSpriteSheet: async () => {
        throw new Error("failed to fetch ./wasm/sff.wasm: 404 Not Found");
      },
    });

    expect(result).toEqual({
      status: "setup-error",
      fileName: "cyclops.sff",
      message: "failed to fetch ./wasm/sff.wasm: 404 Not Found",
    });
  });

  it("reports a parse-error when the WASM module itself reports a bad file", async () => {
    const file = makeFile("cyclops.sff");

    const result = await loadSpriteSheetFromFile(file, {
      readFileBytes: async () => new Uint8Array([1]),
      loadSpriteSheet: async () => ({
        ok: false,
        error: "sff: not a .sff file: unexpected signature",
      }),
    });

    expect(result).toEqual({
      status: "parse-error",
      fileName: "cyclops.sff",
      message: "sff: not a .sff file: unexpected signature",
    });
  });
});
