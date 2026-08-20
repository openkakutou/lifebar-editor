// Sprite-reference Entries within a lifebar Section: an Entry whose key
// ends in ".spr" (case-insensitive) holds a "group, image" pair naming a
// sprite in the loaded `.sff` sheet -- the real MUGEN/Ikemen GO fight.def
// convention (e.g. "p1.bg0.spr = 9000, 0"). Every other key is a plain,
// unstructured property this app doesn't attach any special meaning to.
// See .vibe/decisions/004 for why this is the one sprite-reference shape
// this app recognizes, and why detection lives here rather than in the
// (deliberately generic) LifebarDocument model itself.
import type { Sprite, SpriteGroup } from "../wasm/types.ts";

/** Reports whether key names a sprite-reference Entry (a ".spr" suffix). */
export function isSpriteReferenceKey(key: string): boolean {
  return key.toLowerCase().endsWith(".spr");
}

export type ParsedSpriteReference =
  | { status: "unset" }
  | { status: "malformed"; raw: string }
  | { status: "parsed"; group: number; image: number };

const SPRITE_REF_PATTERN = /^(-?\d+)\s*,\s*(-?\d+)$/;

/**
 * Parses a sprite-reference Entry's raw value into its group/image pair.
 * An empty (or whitespace-only) value is "unset" -- the Entry exists but
 * no sprite has been assigned yet, not an error. Anything else that isn't
 * a "group, image" pair of integers is "malformed".
 */
export function parseSpriteReference(value: string): ParsedSpriteReference {
  const trimmed = value.trim();
  if (trimmed === "") return { status: "unset" };

  const match = trimmed.match(SPRITE_REF_PATTERN);
  if (!match) return { status: "malformed", raw: value };

  return { status: "parsed", group: Number(match[1]), image: Number(match[2]) };
}

/** Formats a group/image pair back into a sprite-reference Entry's raw value. */
export function formatSpriteReference(group: number, image: number): string {
  return `${group}, ${image}`;
}

/** Finds the Sprite at (group, image) within spriteGroups, or null if absent. */
export function findSprite(
  spriteGroups: SpriteGroup[],
  group: number,
  image: number,
): Sprite | null {
  const matchingGroup = spriteGroups.find((g) => g.index === group);
  return matchingGroup?.sprites.find((s) => s.image === image) ?? null;
}

/**
 * The elements editor's own view of a sprite-reference Entry's current
 * state, combining parsing and sheet-lookup into the four states its UI
 * actually distinguishes:
 *
 * - "no-sheet": no sprite sheet is loaded yet, so nothing can be verified
 *   or assigned -- distinct from "invalid" so the UI can prompt to load
 *   one instead of claiming the current value is wrong.
 * - "unset": the Entry's value is empty -- a normal, not-yet-assigned
 *   state, not an error.
 * - "invalid": the value is malformed, or well-formed but names a sprite
 *   the loaded sheet doesn't actually contain.
 * - "valid": the value names a real sprite in the loaded sheet.
 */
export type SpriteReferenceStatus =
  | { kind: "no-sheet" }
  | { kind: "unset" }
  | { kind: "invalid"; raw: string }
  | { kind: "valid"; group: number; image: number };

export function resolveSpriteReference(
  value: string,
  spriteGroups: SpriteGroup[] | null,
): SpriteReferenceStatus {
  if (spriteGroups === null) return { kind: "no-sheet" };

  const parsed = parseSpriteReference(value);
  if (parsed.status === "unset") return { kind: "unset" };
  if (parsed.status === "malformed")
    return { kind: "invalid", raw: parsed.raw };

  const sprite = findSprite(spriteGroups, parsed.group, parsed.image);
  if (!sprite) return { kind: "invalid", raw: value };

  return { kind: "valid", group: parsed.group, image: parsed.image };
}
