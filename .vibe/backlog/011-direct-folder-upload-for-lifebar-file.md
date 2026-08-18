---
status: todo
depends_on: [002]
---
# Folder Selection as the Sole Lifebar File Input Method (Web Build)

## Description
Folder selection becomes the **only** way to load a lifebar for editing on this app's **web build**, replacing the single-file picker/drag-and-drop from item 002 outright: the user selects or drops an entire folder (e.g. a distributed lifebar pack bundling the `.def`-style file with other assets). If the folder contains exactly one candidate lifebar file, it's used automatically; if it contains more than one, the user is prompted to pick which one to load. The chosen file is fed into the same parser item 002 already uses.

Scope: this item covers the web build only. See Notes for why the planned desktop build (roadmap decision `019`, backlog `007`) is explicitly out of scope and won't inherit this folder-only constraint.

## Acceptance Criteria
- [ ] The lifebar file input on the web build is folder selection only — item 002's standalone single-file picker/drop zone is removed, not kept alongside this
- [ ] If the folder contains exactly one candidate lifebar file, it is loaded automatically
- [ ] If the folder contains multiple candidate files, the user is prompted to pick which one to load, instead of the app silently choosing one
- [ ] A folder containing no matching file shows a clear error state, same UX as item 002's malformed/unrecognized-file case

## Notes
Item 002 stays `status: done` as the historical record of the original implementation; this item's first acceptance criterion explicitly calls for removing that UI on the web build once folder selection lands, not leaving both.

Web platform constraint driving this design: picking a single file never grants access to sibling files — neither `<input type="file">` nor the File System Access API's `FileSystemFileHandle` exposes a parent directory, by deliberate browser sandboxing. "Just pick the file, the app finds it" cannot work in a browser without an explicit folder-level permission grant; folder selection is the only way to reach that UX there — but this app only has one file to find anyway, so the win is smaller than for `character-editor`/`stage-editor` (no cross-file reference resolution needed).

**This does not apply to the planned desktop build.** A native app (whichever packaging strategy roadmap backlog `007` eventually picks) has ordinary filesystem access once any file dialog returns a path, with no such sandboxing: a simple single-file picker is enough there. That's a separate file-input design for the desktop build, to be scoped as its own future backlog item once the packaging strategy lands — not something to retrofit here.

Browser support (web build): `<input webkitdirectory>` (Chrome/Firefox/Safari) with `webkitRelativePath` per `File`, or `DataTransferItem.webkitGetAsEntry()` + `FileSystemDirectoryReader.readEntries()` for drag-and-drop.
