// The elements editor (backlog item 004): lets the user select any parsed
// lifebar element (a `LifebarSection`) and edit its properties. A plain
// Entry is a free-text field; a sprite-reference Entry (see
// sprite-reference.ts) instead offers a picker over the loaded `.sff`
// sheet's sprites. Edits mutate the given LifebarDocument in place -- the
// same object reference the caller's document store holds -- so no
// serialize/re-parse round trip is needed to keep the model current.
//
// Sections are rendered as collapsible panels, mirroring sprite-browser.ts's
// own group toggle pattern. Unlike that read-only browser, a section here
// is built eagerly (no lazy-mount-on-expand): there is no async decode to
// gate, only synchronous DOM/state already available from the parsed
// document and the sheet's already-loaded sprite metadata.
import type { LifebarDocument, LifebarSection } from "../lifebar/document.ts";
import type { SpriteGroup } from "../wasm/types.ts";
import {
  type SpriteReferenceStatus,
  formatSpriteReference,
  isSpriteReferenceKey,
  resolveSpriteReference,
} from "./sprite-reference.ts";

export interface ElementsEditorOptions {
  /**
   * Which sections are currently expanded, keyed by index. The caller
   * should pass the same Set instance across re-renders (e.g. when a
   * sprite sheet finishes loading while a panel is already open) so the
   * user's place is preserved instead of every section collapsing again.
   * A fresh Set is used if omitted, meaning every render starts collapsed.
   */
  expandedSections?: Set<number>;
  /**
   * Called whenever an Entry's value is committed, with the value it held
   * just before this commit. The LifebarDocument is always mutated in
   * place regardless of whether this is provided -- it exists for callers/
   * tests that want to observe the change without relying on
   * object-identity mutation alone, and for a caller (item 007's undo/redo
   * wiring) that needs the previous value to build an undo step from.
   */
  onEntryChange?: (
    sectionIndex: number,
    entryIndex: number,
    oldValue: string,
    newValue: string,
  ) => void;
}

/**
 * Renders the elements editor into `root`, replacing its previous content.
 * `document_ === null` (nothing loaded yet) renders nothing, mirroring
 * sprite-browser.ts's own convention. `spriteGroups === null` means no
 * sprite sheet is loaded yet -- distinct from an empty (zero-sprite) sheet.
 */
export function renderElementsEditor(
  root: HTMLElement,
  document_: LifebarDocument | null,
  spriteGroups: SpriteGroup[] | null,
  options: ElementsEditorOptions = {},
): void {
  root.replaceChildren();
  if (document_ === null) return;

  const expandedSections = options.expandedSections ?? new Set<number>();
  const onEntryChange = options.onEntryChange ?? (() => {});

  const panel = document.createElement("wuik-panel");
  panel.className = "elements-editor";

  const heading = document.createElement("h3");
  heading.textContent = `Elements (${document_.sections.length})`;
  panel.appendChild(heading);

  if (document_.sections.length === 0) {
    const empty = document.createElement("p");
    empty.className = "elements-editor__empty";
    empty.textContent = "No elements found.";
    panel.appendChild(empty);
    root.appendChild(panel);
    return;
  }

  const list = document.createElement("div");
  list.className = "elements-editor__list";

  document_.sections.forEach((section, sectionIndex) => {
    list.appendChild(
      buildSection(
        section,
        sectionIndex,
        spriteGroups,
        expandedSections,
        onEntryChange,
      ),
    );
  });

  panel.appendChild(list);
  root.appendChild(panel);
}

function buildSection(
  section: LifebarSection,
  sectionIndex: number,
  spriteGroups: SpriteGroup[] | null,
  expandedSections: Set<number>,
  onEntryChange: (
    sectionIndex: number,
    entryIndex: number,
    oldValue: string,
    newValue: string,
  ) => void,
): HTMLElement {
  const sectionEl = document.createElement("div");
  sectionEl.className = "elements-editor__section";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "elements-editor__section-toggle";
  const expanded = expandedSections.has(sectionIndex);
  toggle.setAttribute("aria-expanded", String(expanded));

  const label = document.createElement("span");
  label.textContent = section.name || "(unnamed section)";
  toggle.appendChild(label);

  // A section is flagged on its own (possibly collapsed) header whenever
  // it holds a sprite reference that needs the user's attention -- an
  // invalid value, or one that can't be verified yet because no sheet is
  // loaded -- so the acceptance criteria's error/prompt states are never
  // silently hidden inside a panel nobody opens.
  const sprEntries = section.entries.filter((e) => isSpriteReferenceKey(e.key));
  const needsAttention = sprEntries.some((e) => {
    const status = resolveSpriteReference(e.value, spriteGroups);
    return status.kind === "invalid" || status.kind === "no-sheet";
  });
  if (needsAttention) {
    const badge = document.createElement("span");
    badge.className = "elements-editor__section-badge";
    badge.textContent = "!";
    badge.setAttribute(
      "aria-label",
      spriteGroups === null
        ? "Needs a loaded sprite sheet"
        : "Has an invalid sprite reference",
    );
    toggle.appendChild(badge);
  }

  const entriesEl = document.createElement("div");
  entriesEl.className = "elements-editor__entries";
  entriesEl.hidden = !expanded;
  buildEntries(entriesEl, section, sectionIndex, spriteGroups, onEntryChange);

  toggle.addEventListener("click", () => {
    const nowExpanded = entriesEl.hidden;
    entriesEl.hidden = !nowExpanded;
    toggle.setAttribute("aria-expanded", String(nowExpanded));
    if (nowExpanded) {
      expandedSections.add(sectionIndex);
    } else {
      expandedSections.delete(sectionIndex);
    }
  });

  sectionEl.append(toggle, entriesEl);
  return sectionEl;
}

function buildEntries(
  entriesEl: HTMLElement,
  section: LifebarSection,
  sectionIndex: number,
  spriteGroups: SpriteGroup[] | null,
  onEntryChange: (
    sectionIndex: number,
    entryIndex: number,
    oldValue: string,
    newValue: string,
  ) => void,
): void {
  if (section.entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "elements-editor__empty";
    empty.textContent = "This element has no properties.";
    entriesEl.appendChild(empty);
    return;
  }

  // Shown once per section, before the first .spr entry, rather than once
  // per field -- a section with several sprite references and no loaded
  // sheet would otherwise repeat the same prompt for every one of them.
  let noSheetPromptShown = false;

  for (const [entryIndex, entry] of section.entries.entries()) {
    const row = document.createElement("div");
    row.className = "elements-editor__entry";

    const key = document.createElement("span");
    key.className = "elements-editor__entry-key";
    key.textContent = entry.key;
    row.appendChild(key);

    if (isSpriteReferenceKey(entry.key)) {
      const status = resolveSpriteReference(entry.value, spriteGroups);
      if (status.kind === "no-sheet") {
        buildReadOnlyValue(row, entry.value);
        if (!noSheetPromptShown) {
          noSheetPromptShown = true;
          const prompt = document.createElement("p");
          prompt.className = "elements-editor__sprite-prompt";
          prompt.textContent =
            "Load a sprite sheet to assign sprites to this element.";
          entriesEl.appendChild(prompt);
        }
      } else {
        buildSpritePicker(
          row,
          entry.value,
          status,
          // biome-ignore lint/style/noNonNullAssertion: status.kind !== "no-sheet" here, so spriteGroups is loaded.
          spriteGroups!,
          (newValue) => {
            const oldValue = entry.value;
            entry.value = newValue;
            onEntryChange(sectionIndex, entryIndex, oldValue, newValue);
          },
        );
      }
    } else {
      buildTextField(row, entry.value, (newValue) => {
        if (newValue === entry.value) return;
        const oldValue = entry.value;
        entry.value = newValue;
        onEntryChange(sectionIndex, entryIndex, oldValue, newValue);
      });
    }

    entriesEl.appendChild(row);
  }
}

function buildTextField(
  row: HTMLElement,
  value: string,
  commit: (newValue: string) => void,
): void {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "elements-editor__entry-input";
  input.value = value;
  input.addEventListener("blur", () => commit(input.value));
  row.appendChild(input);
}

function buildReadOnlyValue(row: HTMLElement, value: string): void {
  const readOnly = document.createElement("span");
  readOnly.className = "elements-editor__entry-readonly";
  readOnly.textContent = value === "" ? "(unset)" : value;
  row.appendChild(readOnly);
}

/** The placeholder <option>'s value -- never a real "group,image" pair. */
const UNSET_OPTION_VALUE = "";

function buildSpritePicker(
  row: HTMLElement,
  rawValue: string,
  status: Exclude<SpriteReferenceStatus, { kind: "no-sheet" }>,
  spriteGroups: SpriteGroup[],
  commit: (newValue: string) => void,
): void {
  const select = document.createElement("select");
  select.className = "elements-editor__sprite-select";

  const placeholder = document.createElement("option");
  placeholder.value = UNSET_OPTION_VALUE;
  placeholder.textContent =
    status.kind === "invalid" ? `Invalid reference: ${rawValue}` : "— none —";
  select.appendChild(placeholder);

  for (const group of spriteGroups) {
    for (const sprite of group.sprites) {
      const option = document.createElement("option");
      const optionValue = `${sprite.group},${sprite.image}`;
      option.value = optionValue;
      option.textContent = `${sprite.group}, ${sprite.image} (${sprite.width}×${sprite.height})`;
      select.appendChild(option);
    }
  }

  // Set explicitly rather than relying on the browser's default
  // first-option selection, so an invalid reference always shows the
  // placeholder -- never a real sprite that merely happens to be first.
  select.value =
    status.kind === "valid"
      ? `${status.group},${status.image}`
      : UNSET_OPTION_VALUE;

  row.appendChild(select);

  let errorEl: HTMLElement | null = null;
  if (status.kind === "invalid") {
    errorEl = document.createElement("span");
    errorEl.className = "elements-editor__sprite-error";
    errorEl.textContent = `"${rawValue}" does not match any sprite in the loaded sheet.`;
    row.appendChild(errorEl);
  }

  select.addEventListener("change", () => {
    errorEl?.remove();
    errorEl = null;

    if (select.value === UNSET_OPTION_VALUE) {
      commit("");
      return;
    }
    const [group, image] = select.value.split(",").map(Number);
    commit(formatSpriteReference(group, image));
  });
}
