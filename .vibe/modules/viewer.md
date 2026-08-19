# Module: viewer
**Role:** Displays an already-loaded sprite sheet: a collapsible list of its groups, each labeled with its sprite count. Expanding a group batch-decodes every sprite it contains in one `wasm.resolveSpritePixels` call and renders each as its own uniform-size thumbnail (skeleton placeholder until the batch resolves, a per-sprite error tile if that one sprite's decode failed) — decoded at most once per group per page load, never re-triggered by collapsing/re-expanding. See `.vibe/decisions/003-sprite-browser-batches-thumbnails-per-group.md`.
**Files:** `src/viewer/sprite-browser.ts`
**Exports:** `renderSpriteBrowser(root, spriteGroups, sffBytes, options?): void`, `computeThumbnailScale(width, height): number`, `defaultDrawPixels(canvas, pixels, width, height): void`, `SpriteBrowserOptions`
**Depends on:** `modules/wasm.md`
