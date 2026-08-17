# Module: input
**Role:** The single-file lifebar input — reads the selected/dropped file as text, parses it via `lifebar`, and reports a typed success/read-error/parse-error result; also renders the file-picker + drag-and-drop UI. Wholesale-replaces the previous outcome on every new drop (unlike `character-editor`'s accumulating multi-slot input).
**Files:** `src/input/lifebar-file-input.ts`, `src/input/lifebar-file-input-view.ts`
**Exports:** `loadLifebarFromFile(file, options?): Promise<LifebarInputResult>`, `readFileAsText(file): Promise<string>`, `LifebarInputResult`, `LifebarFileInputOptions`, `renderLifebarFileInput(root, options): void`, `LifebarFileInputViewOptions`
**Depends on:** `modules/lifebar.md`
