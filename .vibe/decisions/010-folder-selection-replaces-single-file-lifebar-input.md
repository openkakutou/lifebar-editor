---
date: 2026-09-13
status: accepted
---
# Folder selection replaces the single-file lifebar input, ported from sibling repos

**Context:** Backlog item 011 requires the web build's lifebar file input to become folder-selection-only — a distributed lifebar pack's `.def`-style file plus its sibling assets, auto-loading the sole candidate or prompting when several exist — removing item 002's single-file picker/drop zone outright rather than keeping both.

**Decision:** Replace `src/input/lifebar-file-input.ts`/`lifebar-file-input-view.ts` with a folder-based `src/input/lifebar-folder-input.ts`/`lifebar-folder-input-view.ts`, built on a verbatim-ported `src/input/folder-entries.ts` (gathering via `<input webkitdirectory>` or `webkitGetAsEntry`/`FileSystemDirectoryReader`), with candidate detection scoped to `.def`-suffixed files only. Exactly one candidate auto-loads; several show a native `role="radiogroup"` picker labeled with each candidate's relative path (not bare filename, so similarly-named files in different subfolders stay distinguishable); zero candidates or an unreadable/malformed chosen file reuse the same error-status treatment (`role="status"`, error-styled) item 002 already established. A "Choose a different folder" reset action is always available once a result (success or error) is shown. The unrelated sprite sheet single-file input is untouched.

**Reason:** `stage-editor`'s `stage-file-input-view.ts` and `lifebar-viewer-web`'s `lifebar-folder-input-view.ts` already ship this exact interaction shape in this org — the second is the same lifebar `.def` domain, gathering/candidate-resolution/status-state logic and copy ported directly rather than re-derived. A UI/UX consultation confirmed the shape (reset action, relative-path-labeled candidates, unified error treatment, a visible loading state even for the auto-load path so large-pack traversal doesn't look frozen) and surfaced no requirement this port doesn't already satisfy.

**Rejected alternatives:** Keeping the single-file picker alongside folder selection — explicitly excluded by the backlog item's first acceptance criterion. Re-deriving the folder-gathering/candidate-resolution UX from scratch — rejected since two sibling repos already validated it, including the one sharing this app's own lifebar-parsing domain.
