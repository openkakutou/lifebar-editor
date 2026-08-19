// TypeScript vocabulary for the `sff` WASM module's JSON contract. Mirrors
// `sff`'s own Go types (`Sprite`/`SpriteGroup`, see the sff repo's
// sprite.go) field-for-field — metadata only, never decoded pixel data
// (that's what resolveSpritePixels, in bridge.ts, is for).

/** One sprite's metadata within a sprite sheet — position, size, palette reference. */
export interface Sprite {
  group: number;
  image: number;
  width: number;
  height: number;
  axisX: number;
  axisY: number;
  palette: number;
}

/** A collection of sprites sharing the same group index, in file order. */
export interface SpriteGroup {
  index: number;
  sprites: Sprite[];
}
