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
