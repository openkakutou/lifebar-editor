import path from "node:path";
import { waitForVisualReady } from "@openkakutou/web-ui-kit/testing/visual-preset";
import { expect, test } from "@playwright/test";

/**
 * Visual-regression baselines for this app's two real rendered surfaces
 * (backlog item 013) -- the sprite sheet browser's decoded thumbnails, and
 * the elements editor's sprite-assignment result -- both driven through
 * the app's real inputs, with a real sprite decoded through the real `sff`
 * WASM bridge. See
 * .vibe/decisions/012-visual-regression-fixture-reuses-existing-sff-directly.md
 * for why the lifebar fixture and the sprite sheet fixture aren't packaged
 * together, and
 * .vibe/decisions/011-visual-regression-served-via-vite-dev-not-build-preview.md
 * for why the app is served via the plain Vite dev server rather than a
 * build.
 */

// A real folder containing just the purpose-authored fight.def (see its own
// header comment) -- uploaded via Playwright's directory-upload support,
// since the app's lifebar input only accepts a folder through its
// `<input webkitdirectory>` picker, not an arbitrary file list.
const lifebarPackDir = path.resolve(
  import.meta.dirname,
  "fixtures",
  "lifebar-pack",
);

// This repo's own existing real sprite-sheet fixture (one real decoded
// sprite: group 0, image 0, 57x103px) -- loaded through the sprite-sheet
// input's own single-file picker, unrelated to the lifebar folder above.
const spriteSheetFixture = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "src",
  "wasm",
  "testdata",
  "v1-basic.sff",
);

async function loadFixtures(page: import("@playwright/test").Page) {
  await page.goto("/");

  await page.setInputFiles("#lifebar-folder-picker", lifebarPackDir);
  await expect(page.locator(".lifebar-folder-input__status")).toContainText(
    "section(s) found",
  );

  await page.setInputFiles("#sprite-sheet-picker", spriteSheetFixture);
  await expect(page.locator(".sprite-sheet-input__status")).toContainText(
    "group(s) found",
  );
}

test.describe("sprite sheet browser", () => {
  test("matches its baseline after expanding a group and decoding real thumbnails", async ({
    page,
  }) => {
    await loadFixtures(page);

    const group = page.locator(".sprite-browser__group").first();
    await group.locator(".sprite-browser__group-toggle").click();

    // The batch decode is async and not otherwise observable from the DOM
    // alone -- wait until every skeleton placeholder has been replaced by a
    // real decoded canvas before screenshotting.
    await expect(group.locator(".sprite-browser__skeleton")).toHaveCount(0);
    await expect(group.locator(".sprite-browser__canvas")).toHaveCount(1);

    await waitForVisualReady(page);

    await expect(group).toHaveScreenshot("sprite-group-expanded.png");
  });
});

test.describe("elements editor", () => {
  test("matches its baseline after assigning a real sprite to an unset .spr entry", async ({
    page,
  }) => {
    await loadFixtures(page);

    const section = page.locator(".elements-editor__section").first();
    await section.locator(".elements-editor__section-toggle").click();

    const select = section.locator(".elements-editor__sprite-select");
    await select.selectOption("0,0");
    await expect(select).toHaveValue("0,0");

    await waitForVisualReady(page);

    await expect(section).toHaveScreenshot("section-sprite-assigned.png");
  });
});
