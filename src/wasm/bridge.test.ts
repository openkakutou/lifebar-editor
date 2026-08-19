import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadSpriteSheet,
  resetWasmBridgeForTests,
  resolveSpritePixels,
} from "./bridge.ts";

// The real WASM assets (public/wasm/, gitignored) are fetched via
// `npm run wasm:download` before tests run in this environment. There is no
// running dev server under jsdom, so the fetch effects are injected as
// Node-backed stubs instead — same approach as character-viewer-web's own
// bridge test (see its .vibe/decisions/002-wasm-bridge-loading-and-result-shape.md).
const publicWasmDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "public",
  "wasm",
);
const testOptions = {
  fetchWasmExecSource: async () =>
    readFileSync(path.join(publicWasmDir, "wasm_exec.js"), "utf-8"),
  fetchWasmBytes: async () =>
    new Uint8Array(readFileSync(path.join(publicWasmDir, "sff.wasm"))),
};

const testdataDir = path.resolve(import.meta.dirname, "testdata");
function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(testdataDir, name)));
}

// Wrapped in `new Uint8Array(...)`: under Vitest's jsdom environment,
// TextEncoder is a Node-realm polyfill, so its output otherwise fails
// jsdom-realm `instanceof Uint8Array` checks (including the WASM module's
// own argument validation) despite being a genuine byte buffer.
function textBytes(text: string): Uint8Array {
  return new Uint8Array(new TextEncoder().encode(text));
}

const sffBytes = fixture("v1-basic.sff");

beforeEach(() => {
  resetWasmBridgeForTests();
});

describe("loadSpriteSheet", () => {
  it("loads and instantiates the WASM module and returns typed sprite groups for valid input", async () => {
    const result = await loadSpriteSheet(sffBytes, testOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.spriteGroups).toEqual([
      {
        index: 0,
        sprites: [
          {
            group: 0,
            image: 0,
            width: 57,
            height: 103,
            axisX: 25,
            axisY: 99,
            palette: 0,
          },
        ],
      },
    ]);
  });

  it("returns a typed error instead of throwing when the bytes are malformed", async () => {
    const garbageBytes = textBytes("this is not a valid .sff file");

    const result = await loadSpriteSheet(garbageBytes, testOptions);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("returns a typed error instead of throwing for empty input", async () => {
    const result = await loadSpriteSheet(new Uint8Array(0), testOptions);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
  });

  it("still returns a correct result after a prior call reported an error", async () => {
    const errorResult = await loadSpriteSheet(
      textBytes("garbage"),
      testOptions,
    );
    expect(errorResult.ok).toBe(false);

    const okResult = await loadSpriteSheet(sffBytes, testOptions);

    expect(okResult.ok).toBe(true);
    if (!okResult.ok) throw new Error("expected ok result");
    expect(okResult.spriteGroups).toHaveLength(1);
  });

  it("reuses the same WASM instantiation across repeated calls instead of re-fetching", async () => {
    let wasmExecFetchCount = 0;
    let wasmBytesFetchCount = 0;
    const countingOptions = {
      fetchWasmExecSource: async () => {
        wasmExecFetchCount++;
        return testOptions.fetchWasmExecSource();
      },
      fetchWasmBytes: async () => {
        wasmBytesFetchCount++;
        return testOptions.fetchWasmBytes();
      },
    };

    await loadSpriteSheet(sffBytes, countingOptions);
    await loadSpriteSheet(sffBytes, countingOptions);

    expect(wasmExecFetchCount).toBe(1);
    expect(wasmBytesFetchCount).toBe(1);
  });

  it("propagates a fetch failure (e.g. WASM assets not downloaded) instead of hanging or returning a false success", async () => {
    const failingOptions = {
      fetchWasmExecSource: async () => {
        throw new Error("404 not found: ./wasm/wasm_exec.js");
      },
      fetchWasmBytes: testOptions.fetchWasmBytes,
    };

    await expect(loadSpriteSheet(sffBytes, failingOptions)).rejects.toThrow(
      "404 not found",
    );
  });
});

describe("resolveSpritePixels", () => {
  it("decodes a real sprite's pixels at its correct dimensions", async () => {
    const [result] = await resolveSpritePixels(
      sffBytes,
      [[0, 0]],
      null,
      testOptions,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.width).toBe(57);
    expect(result.height).toBe(103);
    expect(result.pixels).toBeInstanceOf(Uint8Array);
    expect(result.pixels.length).toBe(57 * 103 * 4);
  });

  it("decodes several sprites in one batched call, one typed result per request in order", async () => {
    const results = await resolveSpritePixels(
      sffBytes,
      [
        [0, 0],
        [999, 999],
      ],
      null,
      testOptions,
    );

    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
  });

  it("returns a distinguishable error for a sprite that doesn't exist, instead of throwing", async () => {
    const [result] = await resolveSpritePixels(
      sffBytes,
      [[999, 999]],
      null,
      testOptions,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error).toContain("sprite not found");
  });

  it("returns a typed error instead of throwing for malformed sffBytes", async () => {
    const garbageBytes = textBytes("this is not a valid .sff file");

    const [result] = await resolveSpritePixels(
      garbageBytes,
      [[0, 0]],
      null,
      testOptions,
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error.length).toBeGreaterThan(0);
  });
});
