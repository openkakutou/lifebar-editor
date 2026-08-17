---
date: 2026-08-18
status: accepted
---
# Lifebar parser: ordered-list model, case-insensitive accessors, stricter malformed-content errors

**Context:** Backlog item 002 needs a data model and parser for the lifebar `.def`-style format (`[Section Name]` / `key = value` text, e.g. `fight.def`), with no shared `lifebar` library to follow (roadmap decision `009`) and no existing in-org reference implementation yet (`lifebar-viewer-web`'s own equivalent item is still `todo`). Per UI/UX and data-modeling consultation, three shape/behavior choices needed to be made explicitly rather than falling out of whatever was typed first.

**Decision:**
- Sections are stored as an **ordered array**, not keyed by name — real files can legitimately repeat a section name (numbered/duplicated blocks), and an array also preserves file order for any later diff-friendly re-serialization. Same reasoning for each section's entries: an ordered array of `{key, value, line}`, not a `Record`/`Map`, so a duplicate key within one section is retained rather than silently collapsed to last-write-wins.
- Original key/section casing is preserved in the model; lookups go through case-insensitive accessor helpers (`sectionsNamed`/`entriesNamed`), since MUGEN/Ikemen key matching is case-insensitive but the raw text shouldn't be normalized away.
- Every unrecognized-but-syntactically-valid section/key is silently retained (this is exactly what makes an Ikemen-only extension "just work" without this repo needing to know about it in advance). A line that is neither blank/comment, a valid `[Section]` header, nor a valid `key = value` pair is a **parse error**, line-numbered — stricter than `character`'s own `.def`/`.cns` parsers, which tolerate a non-key-value content line inside a section. That tolerance there came from a real multi-hundred-file corpus scan surfacing real-world exceptions; no such corpus evidence exists yet for the lifebar format, and the acceptance criteria explicitly require a malformed-content error path this item needs a concrete trigger for. Revisit (loosen) if a later fixture-driven compatibility item finds real files that trip this.
- The file input is a **single-slot, wholesale-replace** interaction, not the accumulating multi-slot model `character-editor`'s file input uses — there is only ever one file to gather, and re-dropping while a result is already showing discards the previous outcome (model or error) rather than merging.

**Reason:** Locking in ordered storage and case-insensitive accessors now avoids a data-model migration once the elements editor (item 004) actually needs a duplicate section or a differently-cased key — the alternative (name-keyed storage) looks equivalent until the first real file that violates the assumption. Keeping the raw-unevaluated-value philosophy (mirroring `character`'s `cns.Controller`) is what makes "preserves Ikemen extensions" free instead of requiring this item to enumerate every known key.

**Rejected alternatives:**
- **`Record<string, string>` per section**: rejected — silently drops a duplicate key, a real authoring pattern in hand-edited MUGEN files, per data-modeling consultation.
- **Sections keyed by name in a `Map`**: rejected — collapses legitimately repeated section names and loses file order, per the same consultation.
- **Tolerate any non-key-value content line the way `character`'s parsers do**: rejected for now — no corpus evidence yet justifies it, and the acceptance criteria need a real error case to test against.
- **Accumulating multi-slot input model (mirroring `character-editor`)**: rejected — this format is a single file, so the multi-slot accumulation machinery (per-kind extension classification, duplicate-in-one-drop detection) would be solving a problem that doesn't exist here.
