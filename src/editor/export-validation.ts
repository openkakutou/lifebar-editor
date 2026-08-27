// Finds every reason a LifebarDocument isn't safe to export as-is
// (backlog item 005). Two distinct severities, matched to two distinct
// consequences -- see .vibe/decisions/005-save-export-round-trip-and-validation-gate.md:
//
// - "blocking": an entry value containing a literal ";". The MUGEN/Ikemen
//   `.def`-style format has no escape syntax for it -- parse.ts's own
//   stripComment truncates a raw line at the first ";" unconditionally --
//   so exporting it as-is would silently lose data on the next load. Not
//   overridable: the exported text itself would misrepresent the data.
// - "warning": a sprite-reference entry (see sprite-reference.ts) that's
//   invalid, or unverifiable because no sprite sheet is loaded. The
//   exported text itself stays intact and reloadable either way, so this
//   is safe to override.
import type { LifebarDocument } from "../lifebar/document.ts";
import type { SpriteGroup } from "../wasm/types.ts";
import {
  isSpriteReferenceKey,
  resolveSpriteReference,
} from "./sprite-reference.ts";

export interface ExportProblem {
  sectionName: string;
  message: string;
  severity: "blocking" | "warning";
}

/** Every export problem in `document`, one per offending entry, in
 * document order. Returns an empty array when the document is safe to
 * export as-is. */
export function findExportProblems(
  document: LifebarDocument,
  spriteGroups: SpriteGroup[] | null,
): ExportProblem[] {
  const problems: ExportProblem[] = [];

  for (const section of document.sections) {
    for (const entry of section.entries) {
      if (entry.value.includes(";")) {
        problems.push({
          sectionName: section.name,
          message: `"${entry.key}" contains a ";", which this file format can't store in a value.`,
          severity: "blocking",
        });
        continue;
      }

      if (!isSpriteReferenceKey(entry.key)) continue;

      const status = resolveSpriteReference(entry.value, spriteGroups);
      if (status.kind === "invalid") {
        problems.push({
          sectionName: section.name,
          message: `"${entry.key}" does not match any sprite in the loaded sheet.`,
          severity: "warning",
        });
      } else if (status.kind === "no-sheet") {
        problems.push({
          sectionName: section.name,
          message: `"${entry.key}" can't be verified -- load a sprite sheet first.`,
          severity: "warning",
        });
      }
    }
  }

  return problems;
}
