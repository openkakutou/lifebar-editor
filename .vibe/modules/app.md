# Module: app
**Role:** Application entry point. Mounts the app's root frame — a `web-ui-kit` `<wuik-app-shell>` with the app title (`<h1>`) and version, plus the lifebar file input, the sprite sheet input, the elements editor, and the save/export action as main content — into the DOM, or a dependency-free error state if the design tokens stylesheet failed to load. Owns the `Set` of expanded elements-editor section indices, re-rendering the editor (with that same `Set`) after either the lifebar document or the sprite sheet store changes.
**Files:** `src/main.ts`, `src/version.ts`, `src/style.css`
**Exports:** `appVersion: string`, `renderApp(root, version, options?): void`, `designTokensLoaded(target?): boolean`
**Depends on:** `@openkakutou/web-ui-kit` (layout shell + design tokens, external package), `modules/input.md`, `modules/document.md`, `modules/editor.md`
