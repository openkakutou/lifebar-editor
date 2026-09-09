---
status: done
depends_on: [001]
---
# Adopt Localization (i18n)

## Description
Extract this app's hardcoded English UI strings into namespaced message catalogs (`src/i18n/en.json`, `src/i18n/fr.json`) and wire up `web-ui-kit`'s shared i18next integration layer, adding a `<wuik-locale-switcher>` to the app shell so the user can switch language. See roadmap decision `023-localization-approach-for-web-ui.md` for the shared approach.

## Acceptance Criteria
- [x] All user-facing UI strings are moved out of source code into `src/i18n/en.json` and `src/i18n/fr.json`
- [x] The app initializes `web-ui-kit`'s shared i18next configuration under its own namespace
- [x] A `<wuik-locale-switcher>` is present in the app shell and switches the displayed language live, without a page reload
- [x] The selected locale persists across page reloads

## Notes
Also depends on `web-ui-kit` backlog item `011-i18n-core-primitive-and-locale-switcher` landing first, in addition to this repo's own `001-adopt-web-ui-kit-design-system`.

Both dependencies were already done at implementation time (`web-ui-kit` v0.13.0 published with the i18n layer). Bumped this repo's `@openkakutou/web-ui-kit` dependency from `^0.6.0` to `^0.13.0`. Full design approach recorded in `.vibe/decisions/009-i18n-integration-approach.md`. Verified end-to-end against a real browser (Playwright): live switch with no reload, persistence across a real reload, and session state (an expanded elements-editor section) surviving a language switch.
