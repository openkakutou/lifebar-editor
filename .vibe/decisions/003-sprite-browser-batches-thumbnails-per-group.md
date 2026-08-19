---
date: 2026-08-19
status: accepted
---
# Sprite browser batch-decodes a whole group's thumbnails at once, not one sprite on click

**Context:** Backlog item 003 needs a sprite sheet browser on top of the new `sff` WASM bridge. `character-viewer-web` already has an analogous browser for a different WASM module (`character`): sprites are grouped and collapsible, but within an expanded group each sprite is a plain text button — clicking one decodes *that one sprite's* pixels on demand into a single shared preview panel. This item's own acceptance criteria explicitly ask for thumbnails in the list itself ("browse its sprites (thumbnails plus group/index identifiers)"), which the sibling's click-to-preview model doesn't provide.

**Decision:**
- Expanding a group immediately batch-decodes every sprite it contains in one call to the bridge's `resolveSpritePixels` — designed for exactly this (`sffBytes` transferred once, many `[group, image]` pairs resolved together) — rather than one call per sprite.
- Every sprite's `group, image — WxH` label and a skeleton placeholder render synchronously on expand, before the batch resolves — metadata is already known from the sheet's `load` call, so there's nothing to wait for there. Each skeleton is replaced by its own decoded thumbnail (or a per-sprite error tile, since one bad sprite in a batch must not blank the rest) as soon as the batch resolves.
- A group's decode is triggered at most once: the same `mounted` guard that lazily creates a group's DOM on first expand (mirroring the sibling browser's own lazy-mount pattern) also gates the one batched decode call, so collapsing and re-expanding a group never re-decodes or re-flashes a loading state — the already-mounted (or still in-flight, or already-resolved) DOM is simply shown or hidden.

**Reason:** A per-sprite click-then-preview interaction (the sibling's model) satisfies "browse sprites" but not "thumbnails" — the acceptance criteria call for seeing sprites, not selecting one at a time to see it. Batching the decode per group, rather than per sprite, uses the bridge's own batching design as intended (avoiding hundreds of individual round trips through the WASM boundary for a large sheet) while staying bounded: only the sprites in a group the user actually opens are ever decoded, never the whole sheet upfront.

**Rejected alternatives:**
- **Mirror `character-viewer-web` exactly (click-to-preview, one shared panel)**: rejected — doesn't satisfy this item's own thumbnail requirement.
- **Decode every sprite in the whole sheet eagerly on load**: rejected — sheets can hold hundreds of sprites across many groups; nothing in the acceptance criteria needs a sprite decoded before its group is actually opened.
- **One `resolveSpritePixels` call per sprite within a group, fired together**: rejected — works, but re-transfers `sffBytes` once per sprite instead of once per group, the exact inefficiency the bridge's batched call signature exists to avoid.

**Accepted limitation:** A batched decode call blocks the main thread for its duration (the underlying WASM call is synchronous) — a group with many large sprites can cause a brief, unavoidable-within-this-item's-scope UI pause. Not solved here (would need moving the WASM call off the main thread, e.g. a Web Worker); flag as a future item if a real sheet's group sizes make this a practical problem.
