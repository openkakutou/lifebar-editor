---
status: todo
---
# Parse lifebars through the shared `lifebar` library

## Description
Roadmap decision `046`: lifebar parsing moves to `openkakutou/lifebar` (Go, WASM). Replace `src/lifebar/` (`parse.ts`, `serialize.ts`, `document.ts`) with the `lifebar` WASM module, read and write.

Blocked until `lifebar` releases its WASM entrypoint (`lifebar` 007) with the features listed below; pin its exact tag (roadmap decisions `016`, `025`) and add this repo to `lifebar`'s release propagation.

🔒 MUST: no regression on any lifebar this repo loads today.

## Acceptance Criteria
- [ ] `src/lifebar/` parsing and serialization removed; load and save go through the `lifebar` WASM module
- [ ] Saving an unmodified lifebar leaves the file unchanged
- [ ] Needs `lifebar` 001, 006, 007
