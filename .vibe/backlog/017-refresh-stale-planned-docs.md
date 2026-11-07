---
status: todo
---
# Refresh Stale Planned Docs

## Description
CLAUDE.md lists src/wasm, src/lifebar, src/editor and src/wizard as planned although they exist.

## Acceptance Criteria
- [ ] CLAUDE.md status paragraph and layout tree match the packages that actually exist in src/
- [ ] No Planned entry remains for a shipped feature
- [ ] /vibe:sync runs clean

## Notes
Same drift already tracked in stage (018), web-ui-kit (034) and mode-quick-versus (026).
