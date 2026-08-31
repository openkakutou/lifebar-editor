// Pure data builders for the New Lifebar Wizard (backlog item 006) — no
// DOM, no document-store dependency, so every default/template is
// independently unit-testable. See
// .vibe/decisions/006-new-lifebar-wizard-defaults-and-unsaved-changes-guard.md
// for why a template's sprite-reference entries use the empty-string
// "unset" sentinel rather than a fabricated group/image pair.
import type { LifebarDocument } from "../lifebar/document.ts";

/**
 * A brand-new lifebar from scratch: no sections at all. This app's own
 * parser/serializer never requires a minimum set of sections (see
 * .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md — a
 * generic, unevaluated section/entry list with nothing enforced), so an
 * empty section list is already a minimal *valid* document — the user
 * adds their own sections from the elements editor.
 */
export function createBlankLifebar(): LifebarDocument {
  return { sections: [] };
}

export interface LifebarTemplate {
  id: string;
  label: string;
  /** Builds a fresh, independently-mutable document every call. */
  build: () => LifebarDocument;
}

/**
 * A starter template's example lifebar: a life bar and a power bar
 * section, each with a plausible position/range entry plus one
 * sprite-reference entry left "unset" (empty value) — this app's own
 * established convention for "not yet assigned", not an error state (see
 * sprite-reference.ts's own parseSpriteReference).
 */
export const LIFEBAR_TEMPLATES: readonly LifebarTemplate[] = [
  {
    id: "basic-life-power",
    label: "Basic Life/Power Bars",
    build: () => ({
      sections: [
        {
          name: "Life Bar 0",
          line: 1,
          entries: [
            { key: "pos", value: "0, 0", line: 2 },
            { key: "range.x", value: "0, 100", line: 3 },
            { key: "p1.bg0.spr", value: "", line: 4 },
          ],
        },
        {
          name: "Power Bar 0",
          line: 6,
          entries: [
            { key: "pos", value: "0, 20", line: 7 },
            { key: "range.x", value: "0, 100", line: 8 },
            { key: "p1.bg0.spr", value: "", line: 9 },
          ],
        },
      ],
    }),
  },
];
