# Module: scripts
**Role:** Dev-tooling outside the app bundle. Downloads a pinned version's `sff.wasm` + `wasm_exec.js` release assets from the `openkakutou/sff` GitHub repo into `public/wasm/` (gitignored — fetched, never committed), atomically and all-or-nothing (a failed asset rolls back everything downloaded in the same run). Ported from `character-viewer-web`'s own `download-wasm.mjs` for its `character` dependency, repointed at `sff`.
**Files:** `scripts/download-wasm.mjs`
**Exports:** `downloadWasmRelease(options): Promise<string[]>`, `DownloadError`, `EXIT_CODES`, `main(argv?, overrides?): Promise<number>` — run via `npm run wasm:download -- <version>`
**Depends on:** (none — plain Node.js `fs`/`fetch`, not bundled/type-checked by `tsc`)
