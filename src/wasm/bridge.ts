// Bridge to the `sff` WASM module: loads `wasm_exec.js`, instantiates
// `sff.wasm`, and exposes a typed wrapper around the global
// `OpenKakutouSff.load`/`.resolveSprites` calls. Mirrors
// `character-viewer-web`'s own bridge to the `character` WASM module
// field-for-field (same loading strategy: injectable fetch, `Function`-
// executed `wasm_exec.js`, unawaited `go.run`) — see that repo's
// `.vibe/decisions/002-wasm-bridge-loading-and-result-shape.md` for the
// full rationale, which applies unchanged here.
import type { SpriteGroup } from "./types.ts";

const DEFAULT_WASM_EXEC_URL = "./wasm/wasm_exec.js";
const DEFAULT_WASM_BINARY_URL = "./wasm/sff.wasm";

/** The `Go` runtime instance `wasm_exec.js` (via `new globalThis.Go()`) produces. */
interface GoRuntime {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

/** The `{spriteGroups, error}` shape returned synchronously by `OpenKakutouSff.load`. */
interface RawLoadResult {
  spriteGroups: string | null;
  error: string | null;
}

/** The `{pixels, width, height, error}` shape returned per request by `OpenKakutouSff.resolveSprites`. */
interface RawSpriteResult {
  pixels: Uint8Array | null;
  width: number;
  height: number;
  error: string | null;
}

interface OpenKakutouSffGlobal {
  load(sffBytes: Uint8Array): RawLoadResult;
  resolveSprites(
    sffBytes: Uint8Array,
    requests: readonly (readonly [number, number])[],
    overrideBytes: Uint8Array | null,
  ): RawSpriteResult[];
}

export interface WasmBridgeOptions {
  /** Fetches `wasm_exec.js`'s source text. Defaults to `fetch(DEFAULT_WASM_EXEC_URL)`. */
  fetchWasmExecSource?: () => Promise<string>;
  /** Fetches `sff.wasm`'s raw bytes. Defaults to `fetch(DEFAULT_WASM_BINARY_URL)`. */
  fetchWasmBytes?: () => Promise<Uint8Array>;
}

async function defaultFetchWasmExecSource(): Promise<string> {
  const response = await fetch(DEFAULT_WASM_EXEC_URL);
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${DEFAULT_WASM_EXEC_URL}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

async function defaultFetchWasmBytes(): Promise<Uint8Array> {
  const response = await fetch(DEFAULT_WASM_BINARY_URL);
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${DEFAULT_WASM_BINARY_URL}: ${response.status} ${response.statusText}`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

function getGoConstructor(): new () => GoRuntime {
  return (globalThis as unknown as { Go: new () => GoRuntime }).Go;
}

function getOpenKakutouSff(): OpenKakutouSffGlobal {
  return (globalThis as unknown as { OpenKakutouSff: OpenKakutouSffGlobal })
    .OpenKakutouSff;
}

// Memoized across calls so repeated bridge calls don't re-fetch or
// re-instantiate the module. Reset between tests via resetWasmBridgeForTests.
let readyPromise: Promise<void> | null = null;

async function instantiateGoRuntime(options: WasmBridgeOptions): Promise<void> {
  const fetchWasmExecSource =
    options.fetchWasmExecSource ?? defaultFetchWasmExecSource;
  const fetchWasmBytes = options.fetchWasmBytes ?? defaultFetchWasmBytes;

  const wasmExecSource = await fetchWasmExecSource();
  // wasm_exec.js assigns `globalThis.Go = class {...}` itself — it never
  // relies on <script>/module top-level scoping — so executing its source
  // as a function body works identically in a real browser and under
  // jsdom/Node, without needing a DOM <script> element or a servable module
  // URL.
  new Function(wasmExecSource)();

  const go = new (getGoConstructor())();
  const wasmBytes = await fetchWasmBytes();
  const { instance } = await WebAssembly.instantiate(
    wasmBytes as BufferSource,
    go.importObject,
  );

  // Not awaited: Go's main() registers OpenKakutouSff synchronously before
  // blocking forever in select{} — awaiting go.run would hang since main()
  // never returns.
  go.run(instance);
}

function ensureGoRuntimeReady(options: WasmBridgeOptions): Promise<void> {
  if (!readyPromise) {
    readyPromise = instantiateGoRuntime(options).catch((err: unknown) => {
      // Allow a later call to retry instantiation instead of being stuck
      // with a permanently rejected memoized promise.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

/** Resets the memoized WASM instantiation. Test-only. */
export function resetWasmBridgeForTests(): void {
  readyPromise = null;
}

/** One decoded sprite sheet's metadata, or a descriptive error instead of throwing. */
export type SpriteSheetResult =
  | { ok: true; spriteGroups: SpriteGroup[] }
  | { ok: false; error: string };

/**
 * Loads a sprite sheet's metadata from raw `.sff` file bytes via the `sff`
 * WASM module, returning a typed result instead of throwing on
 * malformed/missing input.
 *
 * A failure to bring the WASM module itself up (missing/not-yet-downloaded
 * `public/wasm/` assets, a network error) is a different failure mode from
 * a WASM-reported parse error, and is not represented in this function's
 * return type — it rejects instead, same as `ensureGoRuntimeReady`'s own
 * fetch effects. Callers that need to distinguish "the module couldn't
 * even start" from "the module ran and reported a bad file" (this app's
 * own sprite-sheet input does) should catch around this call.
 */
export async function loadSpriteSheet(
  sffBytes: Uint8Array,
  options: WasmBridgeOptions = {},
): Promise<SpriteSheetResult> {
  await ensureGoRuntimeReady(options);

  const raw = getOpenKakutouSff().load(sffBytes);

  if (raw.error !== null) {
    return { ok: false, error: raw.error };
  }
  if (raw.spriteGroups === null) {
    return {
      ok: false,
      error: "OpenKakutouSff.load returned neither sprite groups nor an error",
    };
  }

  const spriteGroups = JSON.parse(raw.spriteGroups) as SpriteGroup[];
  return { ok: true, spriteGroups };
}

/** One decoded sprite's pixels, or a descriptive error instead of throwing. */
export type SpritePixelResult =
  | { ok: true; pixels: Uint8Array; width: number; height: number }
  | { ok: false; error: string };

/**
 * Decodes one or more sprites' actual on-screen pixels from raw `.sff` file
 * bytes via the `sff` WASM module — unlike `loadSpriteSheet`, whose JSON
 * contract only ever carries sprite *metadata*, never pixel data.
 * `sffBytes` is transferred once for the whole batch, so resolving many
 * sprites from the same sheet (e.g. every sprite in a group being browsed)
 * doesn't re-transfer the file per sprite.
 *
 * `requests` is a list of `[group, image]` pairs, resolved in order — the
 * returned array has exactly one result per request, in the same order.
 * `overridePaletteBytes` is `null` to use each sprite's own palette, or an
 * external `.act` palette file's bytes to recolor every sprite in the batch
 * with it instead.
 */
export async function resolveSpritePixels(
  sffBytes: Uint8Array,
  requests: readonly (readonly [number, number])[],
  overridePaletteBytes: Uint8Array | null,
  options: WasmBridgeOptions = {},
): Promise<SpritePixelResult[]> {
  await ensureGoRuntimeReady(options);

  const raw = getOpenKakutouSff().resolveSprites(
    sffBytes,
    requests,
    overridePaletteBytes,
  );

  return raw.map((entry): SpritePixelResult => {
    if (entry.error !== null || entry.pixels === null) {
      return {
        ok: false,
        error:
          entry.error ??
          "OpenKakutouSff.resolveSprites returned neither pixels nor an error",
      };
    }
    return {
      ok: true,
      pixels: entry.pixels,
      width: entry.width,
      height: entry.height,
    };
  });
}
