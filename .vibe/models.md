# Data models

## LifebarDocument / LifebarSection / LifebarEntry
The parsed lifebar file: an ordered list of sections, each an ordered list of raw, unevaluated key/value entries. Both lists are arrays, never a `Record`/`Map` — a section name or a key can legitimately repeat in a real file, and arrays preserve both that and file order. See `.vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md`.

| Type | Field | Type | Notes |
|---|---|---|---|
| LifebarDocument | sections | LifebarSection[] | In file order |
| LifebarSection | name | string | Original casing; match case-insensitively via `sectionsNamed` |
| LifebarSection | entries | LifebarEntry[] | In file order |
| LifebarSection | line | number | 1-indexed source line of the section header |
| LifebarEntry | key | string | Original casing; match case-insensitively via `entriesNamed` |
| LifebarEntry | value | string | Raw, unevaluated |
| LifebarEntry | line | number | 1-indexed source line |

Defined in: `src/lifebar/document.ts`

## LifebarEditorDocument
The in-memory representation of the currently loaded lifebar file: the parsed document plus the file name it came from.

| Field | Type | Notes |
|---|---|---|
| fileName | string | |
| document | LifebarDocument | |

Defined in: `src/document/lifebar-document-store.ts`

## LifebarParseResult / LifebarInputResult
Discriminated-union results instead of thrown exceptions. `LifebarParseResult` is the parser's own `{status: "success", document} | {status: "error", message}`. `LifebarInputResult` wraps it one layer up, adding the file-read step: `{status: "success", fileName, document} | {status: "read-error", message} | {status: "parse-error", message}`.

Defined in: `src/lifebar/parse.ts`, `src/input/lifebar-file-input.ts`

## Sprite / SpriteGroup
Mirrors the `sff` WASM module's JSON contract field-for-field: sprite metadata only, never decoded pixel data.

| Type | Field | Type | Notes |
|---|---|---|---|
| SpriteGroup | index | number | |
| SpriteGroup | sprites | Sprite[] | In file order |
| Sprite | group / image | number | Together identify the sprite within the sheet |
| Sprite | width / height | number | Pixel dimensions |
| Sprite | axisX / axisY | number | Pivot point offset from the top-left corner |
| Sprite | palette | number | Reference to the palette this sprite is drawn with |

Defined in: `src/wasm/types.ts`

## SpriteSheetResult / SpritePixelResult
Discriminated-union results from the WASM bridge. `SpriteSheetResult` is `{ok: true, spriteGroups} | {ok: false, error}` for a whole-sheet load. `SpritePixelResult` is `{ok: true, pixels, width, height} | {ok: false, error}`, one per requested sprite in a batched decode call.

Defined in: `src/wasm/bridge.ts`

## SpriteSheetInputResult
Wraps `SpriteSheetResult` one layer up, adding the file-read step and distinguishing a WASM-startup failure from a WASM-reported parse error: `{status: "success", fileName, sffBytes, spriteGroups} | {status: "read-error", fileName, message} | {status: "setup-error", fileName, message} | {status: "parse-error", fileName, message}`.

Defined in: `src/input/sprite-sheet-input.ts`

## SffSpriteSheetDocument
The in-memory representation of the currently loaded sprite sheet: its file name, raw bytes (needed for later on-demand pixel decodes when assigning sprites to elements), and decoded metadata.

| Field | Type | Notes |
|---|---|---|
| fileName | string | |
| sffBytes | Uint8Array | |
| spriteGroups | SpriteGroup[] | |

Defined in: `src/document/sff-sprite-sheet-store.ts`
