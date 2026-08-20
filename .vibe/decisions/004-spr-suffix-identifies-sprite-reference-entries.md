---
date: 2026-08-20
status: accepted
---
# A `.spr`-suffixed key identifies a sprite-reference Entry; everything else stays free text

**Context:** Backlog item 004 needs the elements editor to know which of a Section's Entries hold a sprite reference (so it can offer a sprite picker) versus which are plain properties (so it stays a free-text field) — but `LifebarDocument`'s data model is deliberately generic (`.vibe/decisions/002`): an Entry is just an unevaluated `key`/`value` string pair, with no notion of "this one is a sprite reference" attached to it.

**Decision:** An Entry whose `key` ends in `.spr` (case-insensitive) is treated as a sprite reference holding a `"group, image"` pair (e.g. `p1.bg0.spr = 9000, 0`) — the real MUGEN/Ikemen GO fight.def convention for a static sprite assignment (as opposed to `.anim`, which references an `.air` animation number this app has no parser for and is explicitly out of scope). Every other key is rendered and edited as an opaque free-text value, exactly as the existing generic model already treats it — no other key gets structured interpretation from this item. Detection lives in one small pure function (`isSpriteReferenceKey`) the editor UI calls per-Entry; the data model itself is not extended with a new field, keeping `.vibe/decisions/002`'s "don't over-model a format this item doesn't fully interpret yet" intact.

**Reason:** `.spr` is the one sprite-reference shape this app can act on: it names a sprite sheet's `(group, image)` pair directly, which is exactly the metadata the `sff` WASM bridge already exposes (item 003) with no further decoding needed. `.anim` would need this app to also parse `.air` animation data, which is out of scope (see this repo's own CLAUDE.md: no separate `lifebar`/animation library, only `sff` sprite sheets). Detecting the convention by key suffix, rather than extending the data model, keeps the parser and its Entry type untouched — a key this item doesn't recognize as `.spr` still round-trips through save/export (item 005) exactly as unevaluated text, the same guarantee every other key already has.

**Rejected alternatives:**
- *Add a `kind: "sprite" | "text"` field to `LifebarEntry`, decided at parse time*: rejected — reopens the already-closed, deliberately generic parser (`.vibe/decisions/002`) for a distinction only this one editor screen needs, and the parser has no reliable way to know a key's meaning without hardcoding the same suffix convention one layer down instead of one layer up.
- *Treat every Entry as a potential sprite reference and try to parse each value as `"group, image"`, falling back to free text on failure*: rejected — a plain numeric property with two comma-separated numbers (e.g. a position pair) would be misdetected as a sprite reference; the key itself is the only reliable signal.
- *Support `.anim` (animation) references too, resolving through a minimal in-app `.air`-like parser*: rejected as out of scope — no `.air` parsing exists anywhere in this app, and adding one is a much larger, separate concern than this item's own sprite-assignment scope.
