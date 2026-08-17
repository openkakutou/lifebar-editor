// The lifebar `.def`-style file's data model, kept deliberately generic and
// unevaluated — an ordered list of sections, each an ordered list of raw
// key/value entries — rather than typed fields for every known MUGEN/Ikemen
// GO key. This mirrors the "read-path model can't hold everything yet, so
// don't over-model it" philosophy the sibling `character` Go library
// applies to `.cns`/`.cmd` controllers, and is what makes an Ikemen-only
// extension key/section round-trip through unchanged for free, rather than
// requiring this parser to already know every key that exists. See
// .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md for why
// sections/entries are ordered arrays (never a `Record`/`Map`, which would
// silently drop a duplicate section name or key — both real authoring
// patterns in hand-edited MUGEN files).

/** One `key = value` line within a section, in original casing, unevaluated. */
export interface LifebarEntry {
  key: string;
  value: string;
  /** 1-indexed source line this entry was read from. */
  line: number;
}

/** One `[Section Name]` block and the entries found inside it, in file order. */
export interface LifebarSection {
  name: string;
  entries: LifebarEntry[];
  /** 1-indexed source line the section's own header was read from. */
  line: number;
}

/** A fully parsed lifebar file: every section, in the order they appeared. */
export interface LifebarDocument {
  sections: LifebarSection[];
}
