---
date: 2026-09-18
status: accepted
---
# Visual regression fixture reuses the existing real `.sff` test fixture directly, no duplicate copy

**Context:** Backlog item 013 needs a real, purpose-authored lifebar loaded through the app's real inputs, with a sprite decoded through the real `sff` WASM bridge — the same shape the sibling `lifebar-viewer-web` repo already solved for its own visual-regression suite (`.vibe/decisions/010-visual-regression-fixture-uses-real-sprite-decode.md` in that repo), which packages a synthetic `.def` together with a copy of its own real `.sff` fixture into one folder, because that app's single folder input resolves the sheet's filename from the lifebar file itself (`[Files] sff = ...`) and Playwright's directory-upload needs both files physically in the same folder to upload as one selection.

**Decision:** This app's own folder input and sprite-sheet input are two separate, independent controls (the folder picker only ever reads the `.def`-style file; the `.sff` is loaded through its own unrelated single-file picker) — so the visual spec uploads a small fixture folder containing only a purpose-authored `.def` (`tests/visual/fixtures/lifebar-pack/fight.def`, one section with an initially-unset `.spr` entry) through the folder picker, and points the sprite-sheet picker directly at this repo's existing real fixture (`src/wasm/testdata/v1-basic.sff`, already used by `wasm/bridge.test.ts`) via its own absolute path — no second copy of that binary is created.

**Reason:** Unlike `lifebar-viewer-web`, nothing in this app's own upload flow requires the two files to live in the same folder — duplicating the binary would only add an unreviewed second copy of the same asset for no behavioral gain, the same "don't vendor a needless duplicate" reasoning `lifebar-viewer-web`'s own decision already applied to avoid vendoring a brand-new pack.

**Rejected alternatives:** Copying `v1-basic.sff` into the fixture folder anyway, mirroring `lifebar-viewer-web`'s file-for-file structure — rejected as an unnecessary duplicate binary in this repo, since this app's two inputs are decoupled and never expect the sheet to sit alongside the lifebar file.
