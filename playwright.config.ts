import { createVisualProjectConfig } from "@openkakutou/web-ui-kit/testing/visual-preset";
import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// Served via the plain Vite dev server (`npm run dev`), not a build + `vite
// preview` -- `public/wasm/` (the downloaded sff WASM build both the sprite
// browser and the elements editor's sprite picker decode sprites through)
// is served identically either way, and skipping the build removes an
// ordering hazard for no loss of fidelity. See
// .vibe/decisions/011-visual-regression-served-via-vite-dev-not-build-preview.md.
const DEV_SERVER_PORT = 5198;

export default defineConfig({
  ...createVisualProjectConfig({
    testDir: "./tests/visual",
    outputDir: "./test-results",
    use: { baseURL: `http://localhost:${DEV_SERVER_PORT}` },
  }),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${DEV_SERVER_PORT} --strictPort`,
    url: `http://localhost:${DEV_SERVER_PORT}`,
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },
});
