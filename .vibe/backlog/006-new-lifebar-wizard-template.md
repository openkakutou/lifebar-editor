---
status: todo
depends_on: [005]
---
# New Lifebar Wizard/Template

## Description
Add a guided flow to create a brand-new lifebar without first loading an existing file — either fully from scratch (a minimal valid data model with sensible defaults for required elements) or from a bundled starter template. The result feeds into the same in-memory data model used by the elements editor (item 004) and save/export (item 005), so a new lifebar is editable and exportable exactly like a loaded one.

## Acceptance Criteria
- [ ] User can start a new lifebar from scratch, producing a minimal valid in-memory model with sensible defaults
- [ ] User can start a new lifebar from at least one bundled starter template
- [ ] The resulting model is immediately usable by the elements editor (item 004) and exportable via save/export (item 005)
- [ ] Starting a new lifebar while unsaved edits exist on the currently loaded one warns the user before discarding them

## Notes
None.
