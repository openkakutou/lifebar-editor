# Module: document
**Role:** In-memory representation of the currently loaded lifebar file — the parsed document plus its file name — the single place later editor screens read from.
**Files:** `src/document/lifebar-document-store.ts`
**Exports:** `getLifebarDocument(): LifebarEditorDocument | null`, `setLifebarDocument(doc): void`, `resetLifebarDocumentForTests(): void`, `LifebarEditorDocument`
**Depends on:** `modules/lifebar.md` (for `LifebarDocument`)
