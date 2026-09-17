---
date: 2026-09-18
status: accepted
---
# Visual regression tests serve the app via `vite`'s dev server, not a build+preview step

**Context:** Backlog item 013 needs Playwright to drive a running instance of the app to screenshot the sprite browser's decoded thumbnails and the elements editor's sprite-assignment result. Playwright's `webServer` needs some running instance to point at.

**Decision:** `playwright.config.ts`'s `webServer.command` runs the plain dev server (`vite`, the existing `npm run dev` script) instead of building first and running `vite preview`.

**Reason:** `public/wasm/` (the downloaded `sff` WASM build both the sprite browser and the elements editor's sprite picker depend on) is served as static content identically by the dev server and by a built-then-previewed app — no build step changes how it's reached. Skipping the build removes an ordering hazard for no loss of fidelity: this repo's own `deploy-pages.yml` already flags that `wasm:download` must precede `Test`/`Build`, and a new CI job is one more place that ordering could be gotten wrong. This mirrors the identical decision already made in the sibling `lifebar-viewer-web` repo (`.vibe/decisions/011-visual-regression-served-via-vite-dev-not-build-preview.md`) for the same WASM-dependent-static-site shape, and `web-ui-kit`'s own precedent (`tests/visual/dev-preview.visual.spec.ts` serves `dev-preview/` via its own dev server, never a build).

**Rejected alternatives:** Build + `vite preview`, matching the real GitHub Pages deployment path exactly — rejected because this app has no build-time-only rendering logic (no SSR, no bundler-conditional code paths) for a build to meaningfully exercise here, and the ordering hazard above is a real, previously-flagged risk in this exact repo's own CI comments.
