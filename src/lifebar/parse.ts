// Parses MUGEN/Ikemen GO lifebar `.def`-style text (e.g. `fight.def`) into
// a LifebarDocument. Independent from `lifebar-viewer-web`'s own separate
// parser for the same format, per roadmap decision 009. See
// .vibe/decisions/002-lifebar-parser-data-model-and-error-scope.md for the
// malformed-vs-unrecognized distinction this implements: any syntactically
// valid `[Section]`/`key = value` content is retained even if this parser
// has never heard of it (that's what makes an Ikemen-only extension parse
// successfully), but a line that is neither blank, a comment, a valid
// section header, nor a valid `key = value` pair is a parse error.
import type {
  LifebarDocument,
  LifebarEntry,
  LifebarSection,
} from "./document.ts";

export type LifebarParseResult =
  | { status: "success"; document: LifebarDocument }
  | { status: "error"; message: string };

const SECTION_HEADER = /^\[([^\]]*)\]\s*$/;
const OPEN_BRACKET = /^\[/;
const KEY_VALUE = /^([^=]+?)\s*=\s*(.*)$/;

/** Strips a `;` comment (whole-line or trailing) and surrounding whitespace. */
function stripComment(rawLine: string): string {
  const commentIndex = rawLine.indexOf(";");
  const withoutComment =
    commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
  return withoutComment.trim();
}

/**
 * Parses `text` into a LifebarDocument. An empty (or whitespace/comment-only)
 * input returns an explicit empty document, not an error — the same
 * convention `character`'s own `.def`/`.cns`/`.air` parsers already follow.
 */
export function parseLifebar(text: string): LifebarParseResult {
  const rawLines = text.split("\n");
  const sections: LifebarSection[] = [];
  let current: LifebarSection | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const line = stripComment(rawLines[i]);
    if (line === "") continue;

    if (OPEN_BRACKET.test(line)) {
      const headerMatch = line.match(SECTION_HEADER);
      if (!headerMatch) {
        return {
          status: "error",
          message: `line ${lineNumber}: malformed section header (missing closing "]").`,
        };
      }
      current = { name: headerMatch[1].trim(), entries: [], line: lineNumber };
      sections.push(current);
      continue;
    }

    const entryMatch = line.match(KEY_VALUE);
    const key = entryMatch?.[1].trim();
    if (!entryMatch || !key) {
      return {
        status: "error",
        message: `line ${lineNumber}: expected a "[Section Name]" header or a "key = value" pair, found "${line}".`,
      };
    }

    if (!current) {
      return {
        status: "error",
        message: `line ${lineNumber}: content appears before any "[Section Name]" header: "${line}".`,
      };
    }

    const entry: LifebarEntry = {
      key,
      value: entryMatch[2].trim(),
      line: lineNumber,
    };
    current.entries.push(entry);
  }

  return { status: "success", document: { sections } };
}

/** Every section named `name`, matched case-insensitively, in file order. */
export function sectionsNamed(
  document: LifebarDocument,
  name: string,
): LifebarSection[] {
  const target = name.toLowerCase();
  return document.sections.filter(
    (section) => section.name.toLowerCase() === target,
  );
}

/** Every entry keyed `key` within `section`, matched case-insensitively, in file order. */
export function entriesNamed(
  section: LifebarSection,
  key: string,
): LifebarEntry[] {
  const target = key.toLowerCase();
  return section.entries.filter((entry) => entry.key.toLowerCase() === target);
}
