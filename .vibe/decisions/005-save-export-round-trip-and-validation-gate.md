---
date: 2026-08-27
status: accepted
---
# Save/export: semantic round-trip fidelity, and a two-tier export validation gate

**Context:** Backlog item 005 adds serialization (`LifebarDocument` → `.def`-style text) and a Save/Export action. The existing parser already discards comments and original whitespace at parse time, so byte-identical round-tripping is impossible even for an untouched file. Separately, the format has no escape syntax for `;` (`parseLifebar`'s `stripComment` truncates a raw line at the first `;` unconditionally), so an edited value containing one would silently lose data on reload if exported as-is. A sprite reference can also be invalid or unverifiable (no sheet loaded) without the exported text itself being corrupt.

**Decision:**
1. "Format-preserving round trip" (the item's own acceptance criterion) is defined as *semantic* equivalence, not byte-identical text: re-parsing a fresh serialization must reproduce the same sections (name, order) and entries (key, value, order) as the original parse, ignoring source line numbers. Serialization always walks the sections/entries arrays in original order — never grouped, sorted, or deduplicated by name/key — preserving the same intentional-duplicates guarantee decision 002 established for parsing.
2. Before exporting, the whole document is checked for two distinct kinds of problem, both reported per offending entry with its section name:
   - **Blocking** (no override): any entry value containing a literal `;` — exporting it as-is would silently truncate on the next load, so this must be fixed before export can proceed at all.
   - **Warning** (overridable): a sprite-reference entry that's invalid, or unverifiable because no sprite sheet is loaded — the exported text itself would still be intact and reloadable, so the user may explicitly export anyway via a clearly separate secondary action, rather than being blocked from ever saving in-progress work (this app has no other persistence mechanism).

**Reason:** The parser's own documented behavior already makes byte-identical round-tripping unreachable, so promising it would be a guarantee the code can't keep; semantic equivalence is the strongest claim actually true. Splitting the export gate into blocking vs. warning matches the real difference in consequence — one loses data silently and irreversibly, the other doesn't — and avoids the opposite failure modes of either always blocking (trapping legitimate in-progress work with no way to save it) or never blocking (silently shipping a corrupt file).

**Rejected alternatives:**
- *Byte-identical round trip* — rejected: would require retaining comments/original whitespace in the data model, out of scope for this item and not requested by it.
- *Single-tier "any problem blocks export, no override"* — rejected per UI/UX consultation: with no autosave elsewhere in this app, a hard block on a merely-unverified sprite reference (e.g. sheet not loaded yet) would leave a user with no way to save otherwise-valid edits.
- *Silently truncating a value containing `;` on export* — rejected: matches the acceptance criterion's own "never silently export broken data," and a truncation is unrecoverable once the original in-memory value is gone.
