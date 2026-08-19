# Module: document
**Role:** In-memory representation of whatever is currently loaded, one store per format — the place later editor screens read from. The lifebar store holds the parsed document plus its file name; the sprite sheet store holds the file name, raw bytes (needed for later on-demand pixel decodes), and decoded sprite groups.
**Files:** `src/document/lifebar-document-store.ts`, `src/document/sff-sprite-sheet-store.ts`
**Exports:** `getLifebarDocument(): LifebarEditorDocument | null`, `setLifebarDocument(doc): void`, `resetLifebarDocumentForTests(): void`, `LifebarEditorDocument`, `getSffSpriteSheet(): SffSpriteSheetDocument | null`, `setSffSpriteSheet(doc): void`, `resetSffSpriteSheetForTests(): void`, `SffSpriteSheetDocument`
**Depends on:** `modules/lifebar.md` (for `LifebarDocument`), `modules/wasm.md` (for `SpriteGroup`)
