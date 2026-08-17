---
date: 2026-08-17
status: accepted
---
# `web-ui-kit` scaffold adoption: separate heading/version, and a visible error state on token-load failure

**Context:** Backlog item 001 requires adopting `web-ui-kit`'s layout shell and design tokens as this app's root frame, with no other real screen yet to build around. Its acceptance criteria don't explicitly ask for a heading/version split or a token-load failure state, unlike some sibling repos' own versions of this same item.

**Decision:**
- The toolbar's app title is a single `<h1>`, with the version rendered as a separate, visually secondary element right after it — not one combined string in a plain `<span>` (the pattern most sibling repos used).
- A missing/failed `web-ui-kit` tokens stylesheet degrades to a visible, dependency-free error state instead of an unstyled or blank shell, mirroring `lifebar-viewer-web`'s own item 001 (the sibling app in the same domain).

**Reason:** A UI/UX consultation flagged that a combined title+version string gets announced by assistive tech as a single ambiguous heading, and that this scaffold is the root frame every future real screen in this repo inherits — a gap here compounds later rather than staying contained to a placeholder. Following `lifebar-viewer-web`'s existing token-failure-detection pattern (rather than inventing a new one, or skipping it like `character-viewer-web`/`character-editor` did) keeps the two lifebar apps consistent with each other, and was verified for real against a production build with the tokens stylesheet blocked.

**Rejected alternatives:**
- *Combined `"App Title — vX.Y.Z"` string in one `<span>`, as most sibling repos did*: rejected — ambiguous for assistive tech, and this repo already has a same-domain sibling (`lifebar-viewer-web`) with the better pattern to mirror instead.
- *No token-load failure state, matching `character-viewer-web`/`character-editor`'s scope*: rejected — the failure mode is worse for an editor than a viewer (unstyled native form controls under a half-applied token sheet), and the fix is cheap at this scaffold stage.
