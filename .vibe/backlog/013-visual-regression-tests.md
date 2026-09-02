---
status: todo
---
# Visual Regression Tests

## Description
Add automated Playwright screenshot-comparison tests covering this app's real rendered surfaces — the sprite sheet browser's decoded thumbnails, and the elements editor's per-section preview after assigning a sprite to a `.spr`-suffixed entry. See roadmap decision `024-visual-regression-testing-via-playwright-screenshots.md` for the shared approach.

## Acceptance Criteria
- [ ] The app's Playwright config extends `web-ui-kit`'s shared visual-testing config/fixture
- [ ] Baseline screenshots exist for: an expanded sprite group's decoded thumbnails, and a lifebar section's preview after assigning a real sprite to one of its entries
- [ ] `npm run test:visual` runs these in CI as its own job, separate from `npm test`, and fails the build on a diff
- [ ] A real, deliberate rendering regression (verified by temporarily breaking one covered path, then reverting) is caught by this suite

## Notes
Depends on `web-ui-kit` backlog item `013-visual-regression-shared-playwright-config-and-component-snapshots` landing first.
