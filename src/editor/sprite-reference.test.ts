import { describe, expect, it } from "vitest";
import type { SpriteGroup } from "../wasm/types.ts";
import {
  findSprite,
  formatSpriteReference,
  isSpriteReferenceKey,
  parseSpriteReference,
  resolveSpriteReference,
} from "./sprite-reference.ts";

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
        {
          group: 9000,
          image: 1,
          width: 32,
          height: 32,
          axisX: 16,
          axisY: 32,
          palette: 0,
        },
      ],
    },
    {
      index: 1,
      sprites: [
        {
          group: 1,
          image: 0,
          width: 100,
          height: 20,
          axisX: 0,
          axisY: 0,
          palette: 0,
        },
      ],
    },
  ];
}

describe("isSpriteReferenceKey", () => {
  it("recognizes a key ending in .spr, case-insensitively", () => {
    expect(isSpriteReferenceKey("p1.bg0.spr")).toBe(true);
    expect(isSpriteReferenceKey("p1.bg0.SPR")).toBe(true);
    expect(isSpriteReferenceKey("P1.BG0.Spr")).toBe(true);
  });

  it("rejects a key that does not end in .spr", () => {
    expect(isSpriteReferenceKey("p1.bg0.anim")).toBe(false);
    expect(isSpriteReferenceKey("p1.range.x")).toBe(false);
    expect(isSpriteReferenceKey("spr")).toBe(false); // no leading "."
    expect(isSpriteReferenceKey("p1.bg0.sprx")).toBe(false);
  });
});

describe("parseSpriteReference", () => {
  it("parses a well-formed 'group, image' pair", () => {
    expect(parseSpriteReference("9000, 0")).toEqual({
      status: "parsed",
      group: 9000,
      image: 0,
    });
  });

  it("tolerates no space after the comma", () => {
    expect(parseSpriteReference("9000,0")).toEqual({
      status: "parsed",
      group: 9000,
      image: 0,
    });
  });

  it("treats an empty (or whitespace-only) value as unset", () => {
    expect(parseSpriteReference("")).toEqual({ status: "unset" });
    expect(parseSpriteReference("   ")).toEqual({ status: "unset" });
  });

  it("reports non-numeric or malformed text as malformed", () => {
    expect(parseSpriteReference("not-a-sprite")).toEqual({
      status: "malformed",
      raw: "not-a-sprite",
    });
    expect(parseSpriteReference("9000")).toEqual({
      status: "malformed",
      raw: "9000",
    });
  });
});

describe("formatSpriteReference", () => {
  it("formats a group/image pair as 'group, image'", () => {
    expect(formatSpriteReference(9000, 1)).toBe("9000, 1");
  });
});

describe("findSprite", () => {
  it("finds a sprite by its group and image index", () => {
    const sprite = findSprite(spriteGroups(), 9000, 1);
    expect(sprite).toEqual({
      group: 9000,
      image: 1,
      width: 32,
      height: 32,
      axisX: 16,
      axisY: 32,
      palette: 0,
    });
  });

  it("returns null when the group does not exist", () => {
    expect(findSprite(spriteGroups(), 42, 0)).toBeNull();
  });

  it("returns null when the group exists but the image index does not", () => {
    expect(findSprite(spriteGroups(), 9000, 99)).toBeNull();
  });
});

describe("resolveSpriteReference", () => {
  it("reports no-sheet when spriteGroups is null, regardless of value", () => {
    expect(resolveSpriteReference("9000, 0", null)).toEqual({
      kind: "no-sheet",
    });
    expect(resolveSpriteReference("", null)).toEqual({ kind: "no-sheet" });
  });

  it("reports unset for an empty value once a sheet is loaded", () => {
    expect(resolveSpriteReference("", spriteGroups())).toEqual({
      kind: "unset",
    });
  });

  it("reports valid for a value matching a real sprite in the loaded sheet", () => {
    expect(resolveSpriteReference("9000, 1", spriteGroups())).toEqual({
      kind: "valid",
      group: 9000,
      image: 1,
    });
  });

  it("reports invalid for a well-formed pair not present in the loaded sheet", () => {
    expect(resolveSpriteReference("9000, 99", spriteGroups())).toEqual({
      kind: "invalid",
      raw: "9000, 99",
    });
  });

  it("reports invalid for malformed text", () => {
    expect(resolveSpriteReference("garbage", spriteGroups())).toEqual({
      kind: "invalid",
      raw: "garbage",
    });
  });
});
