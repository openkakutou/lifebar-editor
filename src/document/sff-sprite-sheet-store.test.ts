import { beforeEach, describe, expect, it } from "vitest";
import {
  getSffSpriteSheet,
  resetSffSpriteSheetForTests,
  setSffSpriteSheet,
} from "./sff-sprite-sheet-store.ts";

describe("sff sprite sheet store", () => {
  beforeEach(() => {
    resetSffSpriteSheetForTests();
  });

  it("has no loaded sheet before anything is set", () => {
    expect(getSffSpriteSheet()).toBeNull();
  });

  it("returns exactly what was set", () => {
    const loaded = {
      fileName: "cyclops.sff",
      sffBytes: new Uint8Array([1, 2, 3]),
      spriteGroups: [{ index: 0, sprites: [] }],
    };

    setSffSpriteSheet(loaded);

    expect(getSffSpriteSheet()).toEqual(loaded);
  });

  it("clears back to null when set to null", () => {
    setSffSpriteSheet({
      fileName: "cyclops.sff",
      sffBytes: new Uint8Array([1]),
      spriteGroups: [],
    });

    setSffSpriteSheet(null);

    expect(getSffSpriteSheet()).toBeNull();
  });
});
