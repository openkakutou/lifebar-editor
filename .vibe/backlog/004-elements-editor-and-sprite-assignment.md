---
status: in_progress
depends_on: [003]
---
# Elements Editor + Sprite Assignment

## Description
The core editing screen: let the user select any lifebar element (life bar, power bar, combo counter, round display, and the other elements defined in the parsed model from item 002) and edit its position/layout properties, plus assign it a sprite browsed from the `sff` WASM bridge (item 003). Changes update the in-memory lifebar data model in place, ready to be serialized back out by save/export (item 005).

## Acceptance Criteria
- [ ] User can select any parsed lifebar element and view/edit its position and layout properties
- [ ] User can assign a sprite (browsed via the `sff` WASM bridge) to an element that references one
- [ ] Edits update the in-memory lifebar data model without requiring a full re-parse
- [ ] Attempting to assign a sprite that doesn't exist in the loaded sprite sheet (bad group/index) shows a clear error instead of silently corrupting the model
- [ ] Editing an element with no loaded sprite sheet yet prompts the user instead of failing silently

## Notes
None.
