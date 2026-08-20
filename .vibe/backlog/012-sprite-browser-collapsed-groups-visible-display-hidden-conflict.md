---
status: todo
---
# Sprite Browser's Collapsed Groups Are Actually Visible (display/hidden CSS conflict)

## Description
`sprite-browser.ts` toggles a group's thumbnail grid via the DOM `hidden` property (`grid.hidden = true/false`), relying on the browser's default `[hidden] { display: none }` user-agent rule to actually hide it while collapsed. `.sprite-browser__grid`'s own CSS rule sets `display: flex` unconditionally, and an author stylesheet rule wins over the UA stylesheet at equal specificity — so `hidden` is set correctly in the DOM (`aria-expanded`/JS state are accurate) but has **no visible effect**: every group's thumbnails render fully expanded regardless of collapsed state. Found via real-browser runtime verification while building item 004's own elements editor, which copies the same toggle pattern and needed the equivalent fix (`.elements-editor__entries[hidden] { display: none; }`) to actually work.

Confirmed with jsdom-based unit tests passing throughout (`sprite-browser.test.ts` only asserts the `hidden` DOM property, which is set correctly) — this is a real-browser-only defect jsdom cannot catch, not a logic bug.

## Acceptance Criteria
- [ ] A collapsed sprite group's thumbnail grid is not visible on screen in a real browser (verified via a real browser check, not just the `hidden` property)
- [ ] Expanding a group still shows its thumbnails as before
- [ ] Existing `sprite-browser.test.ts` tests continue to pass unmodified (the fix is CSS-only)

## Notes
The fix is the same one-rule pattern applied in `.vibe/decisions/004`'s companion work: add `.sprite-browser__grid[hidden] { display: none; }` (higher specificity than the plain class rule) to `style.css`.
