// Serializes a LifebarDocument back into `.def`-style text (backlog item
// 005) -- the write-side counterpart to parse.ts. "Format-preserving round
// trip" here means *semantic* equivalence (same sections/entries, in the
// same order), not byte-identical text: the model already discards
// comments and original spacing at parse time, so byte-identical output is
// not a guarantee this code can make. See
// .vibe/decisions/005-save-export-round-trip-and-validation-gate.md.
//
// Sections/entries are walked strictly in array order -- never grouped,
// sorted, or deduplicated by name/key -- so a duplicated section name or a
// repeated key (decision 002's whole reason for using ordered arrays)
// serializes back out as separate blocks/lines, not merged into one.
import type { LifebarDocument } from "./document.ts";

/** Serializes `document` into `.def`-style text: one "[Section]" header per
 * section, its entries as "key = value" lines, sections separated by a
 * blank line. An empty document serializes to an empty string. */
export function serializeLifebar(document: LifebarDocument): string {
  const blocks = document.sections.map((section) => {
    const lines = [`[${section.name}]`];
    for (const entry of section.entries) {
      lines.push(`${entry.key} = ${entry.value}`);
    }
    return lines.join("\n");
  });

  if (blocks.length === 0) return "";
  return `${blocks.join("\n\n")}\n`;
}
