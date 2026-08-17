# Module: lifebar
**Role:** The MUGEN/Ikemen GO lifebar `.def`-style format itself — a generic, unevaluated data model (ordered sections, each an ordered list of raw key/value entries) and its text parser. Independent from `lifebar-viewer-web`'s own separate implementation of the same format (roadmap decision 009).
**Files:** `src/lifebar/document.ts`, `src/lifebar/parse.ts`
**Exports:** `LifebarDocument`, `LifebarSection`, `LifebarEntry`, `parseLifebar(text): LifebarParseResult`, `LifebarParseResult`, `sectionsNamed(document, name): LifebarSection[]`, `entriesNamed(section, key): LifebarEntry[]`
**Depends on:** none
