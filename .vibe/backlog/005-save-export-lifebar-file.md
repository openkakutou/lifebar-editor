---
status: todo
depends_on: [004]
---
# Save/Export Lifebar File

## Description
Serialize the in-memory lifebar data model (as edited via item 004) back into the `.def`-style file format, so the user can download their changes. Serialization should be format-preserving where possible — comments, ordering, and untouched sections of the original file should survive a round trip unchanged, matching the same care `character`/`stage` apply to their own format-preserving serializers.

## Acceptance Criteria
- [ ] User can export the current in-memory lifebar model as a downloadable `.def`-style file
- [ ] Loading a file, making no edits, and exporting it again produces an output equivalent to the original (format-preserving round trip)
- [ ] Edited elements are reflected correctly in the exported file, including sprite assignments made in item 004
- [ ] Exporting a lifebar model with unresolved/invalid state (e.g. an element still missing a required sprite reference) shows a clear warning instead of silently exporting broken data

## Notes
None.
