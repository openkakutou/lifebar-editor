# Module: lifebar
**Role:** The MUGEN/Ikemen GO lifebar `.def`-style format itself — a generic, unevaluated data model (ordered sections, each an ordered list of raw key/value entries) and its text parser/serializer. Independent from `lifebar-viewer-web`'s own separate implementation of the same format (roadmap decision 009). `serialize.ts` (backlog item 005) is the write-side counterpart to `parse.ts`: it walks sections/entries strictly in array order (never grouped or deduplicated), so "format-preserving round trip" here means semantic equivalence on re-parse, not byte-identical text — see `.vibe/decisions/005`.
**Files:** `src/lifebar/document.ts`, `src/lifebar/parse.ts`, `src/lifebar/serialize.ts`
**Exports:** `LifebarDocument`, `LifebarSection`, `LifebarEntry`, `parseLifebar(text): LifebarParseResult`, `LifebarParseResult`, `sectionsNamed(document, name): LifebarSection[]`, `entriesNamed(section, key): LifebarEntry[]`, `serializeLifebar(document): string`
**Depends on:** none
