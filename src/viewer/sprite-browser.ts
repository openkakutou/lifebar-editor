// The sprite sheet browser (backlog item 003): browse every sprite
// group/image of a loaded `.sff` sheet as thumbnails. Unlike
// `character-viewer-web`'s own sprite browser (one text button per sprite,
// single on-demand decode + shared preview panel on click), this app's own
// acceptance criteria ask for thumbnails directly in the list — so
// expanding a group batch-decodes every sprite it contains in one WASM
// call (the bridge's own `resolveSpritePixels` is designed for exactly
// this: transfer `sffBytes` once, resolve many `[group, image]` pairs) and
// renders each as its own small canvas, rather than one sprite at a time.
// See .vibe/decisions/003-sprite-browser-batches-thumbnails-per-group.md.
import {
  type SpritePixelResult,
  type WasmBridgeOptions,
  resolveSpritePixels as defaultResolveSpritePixels,
} from "../wasm/bridge.ts";
import type { Sprite, SpriteGroup } from "../wasm/types.ts";

/** Uniform thumbnail cell target size (px) every sprite's canvas scales to fit within. */
const THUMBNAIL_TARGET_PX = 64;
/** Never upscale a tiny sprite past this factor — a 1px sprite blown up 8x is still not "readable", just blocky. */
const MAX_UPSCALE = 8;

/** Scale factor (CSS-applied, never touching the pixel buffer) fitting `width`x`height` into a thumbnail cell. */
export function computeThumbnailScale(width: number, height: number): number {
  const largestSide = Math.max(width, height);
  if (largestSide <= 0) return 1;
  return Math.min(THUMBNAIL_TARGET_PX / largestSide, MAX_UPSCALE);
}

/**
 * Draws `pixels` onto `canvas` at their native resolution. The real,
 * browser-only implementation — tests inject a stub instead, since jsdom
 * does not implement `HTMLCanvasElement.getContext("2d")` at all.
 */
export function defaultDrawPixels(
  canvas: HTMLCanvasElement,
  pixels: Uint8Array,
  width: number,
  height: number,
): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(pixels), width, height),
    0,
    0,
  );
}

export interface SpriteBrowserOptions {
  /** Batch-decodes sprite pixels. Defaults to the real WASM bridge; injectable for testing. */
  resolveSpritePixels?: (
    sffBytes: Uint8Array,
    requests: readonly (readonly [number, number])[],
    overridePaletteBytes: Uint8Array | null,
    options?: WasmBridgeOptions,
  ) => Promise<SpritePixelResult[]>;
  /** Forwarded to the default resolveSpritePixels; ignored if resolveSpritePixels is overridden. */
  bridgeOptions?: WasmBridgeOptions;
  /** Draws decoded pixels onto a thumbnail canvas. Defaults to the real canvas 2D draw; injectable for testing. */
  drawPixels?: (
    canvas: HTMLCanvasElement,
    pixels: Uint8Array,
    width: number,
    height: number,
  ) => void;
}

/**
 * Renders the sprite sheet browser into `root`, replacing its previous
 * content (and any in-flight per-group decode state) entirely.
 * `spriteGroups === null` or `sffBytes === null` (nothing loaded yet)
 * renders nothing, mirroring `character-viewer-web`'s own convention.
 */
export function renderSpriteBrowser(
  root: HTMLElement,
  spriteGroups: SpriteGroup[] | null,
  sffBytes: Uint8Array | null,
  options: SpriteBrowserOptions = {},
): void {
  root.replaceChildren();
  if (spriteGroups === null || sffBytes === null) return;
  // Narrowed into a fresh binding: TS does not carry a parameter's narrowed
  // type into a nested closure since it can't prove the parameter isn't
  // reassigned before the closure runs.
  const sffBytesNonNull: Uint8Array = sffBytes;

  const resolvePixels =
    options.resolveSpritePixels ?? defaultResolveSpritePixels;
  const drawPixels = options.drawPixels ?? defaultDrawPixels;

  const totalSpriteCount = spriteGroups.reduce(
    (sum, group) => sum + group.sprites.length,
    0,
  );

  const panel = document.createElement("wuik-panel");
  panel.className = "sprite-browser";

  const heading = document.createElement("h3");
  heading.textContent = `Sprites (${totalSpriteCount})`;
  panel.appendChild(heading);

  if (totalSpriteCount === 0) {
    const empty = document.createElement("p");
    empty.className = "sprite-browser__empty";
    empty.textContent = "No sprites found.";
    panel.appendChild(empty);
    root.appendChild(panel);
    return;
  }

  const list = document.createElement("div");
  list.className = "sprite-browser__list";

  for (const group of spriteGroups) {
    list.appendChild(
      buildGroup(
        group,
        sffBytesNonNull,
        resolvePixels,
        drawPixels,
        options.bridgeOptions,
      ),
    );
  }

  panel.appendChild(list);
  root.appendChild(panel);
}

function buildGroup(
  group: SpriteGroup,
  sffBytes: Uint8Array,
  resolvePixels: NonNullable<SpriteBrowserOptions["resolveSpritePixels"]>,
  drawPixels: NonNullable<SpriteBrowserOptions["drawPixels"]>,
  bridgeOptions: WasmBridgeOptions | undefined,
): HTMLElement {
  const groupEl = document.createElement("div");
  groupEl.className = "sprite-browser__group";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sprite-browser__group-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = `Group ${group.index} (${group.sprites.length})`;

  const grid = document.createElement("div");
  grid.className = "sprite-browser__grid";
  grid.hidden = true;

  let expanded = false;
  // Guards both DOM creation and decode kickoff: mounting (and the one
  // batched decode call it triggers) happens at most once per group, no
  // matter how many times the user collapses and re-expands it — a
  // re-expand just toggles `hidden` back off and shows whatever the
  // (possibly already-resolved, possibly still in-flight) batch produced.
  let mounted = false;

  toggle.addEventListener("click", () => {
    expanded = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    grid.hidden = !expanded;
    if (expanded && !mounted) {
      mounted = true;
      mountThumbnails(
        group,
        grid,
        sffBytes,
        resolvePixels,
        drawPixels,
        bridgeOptions,
      );
    }
  });

  groupEl.append(toggle, grid);
  return groupEl;
}

function mountThumbnails(
  group: SpriteGroup,
  grid: HTMLElement,
  sffBytes: Uint8Array,
  resolvePixels: NonNullable<SpriteBrowserOptions["resolveSpritePixels"]>,
  drawPixels: NonNullable<SpriteBrowserOptions["drawPixels"]>,
  bridgeOptions: WasmBridgeOptions | undefined,
): void {
  const cells = group.sprites.map((sprite) => buildCell(sprite, grid));

  const requests = group.sprites.map((sprite): [number, number] => [
    sprite.group,
    sprite.image,
  ]);

  resolvePixels(sffBytes, requests, null, bridgeOptions).then((results) => {
    results.forEach((result, i) => fillCell(cells[i], result, drawPixels));
  });
}

function buildCell(sprite: Sprite, grid: HTMLElement): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "sprite-browser__thumb";

  const skeleton = document.createElement("div");
  skeleton.className = "sprite-browser__skeleton";
  cell.appendChild(skeleton);

  const label = document.createElement("span");
  label.className = "sprite-browser__thumb-label";
  label.textContent = `${sprite.group}, ${sprite.image} — ${sprite.width}×${sprite.height}`;
  cell.appendChild(label);

  grid.appendChild(cell);
  return cell;
}

function fillCell(
  cell: HTMLElement,
  result: SpritePixelResult,
  drawPixels: NonNullable<SpriteBrowserOptions["drawPixels"]>,
): void {
  cell.querySelector(".sprite-browser__skeleton")?.remove();

  if (!result.ok) {
    const error = document.createElement("span");
    error.className = "sprite-browser__thumb-error";
    error.textContent = result.error;
    cell.insertBefore(error, cell.firstChild);
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "sprite-browser__canvas";
  const scale = computeThumbnailScale(result.width, result.height);
  canvas.style.width = `${result.width * scale}px`;
  canvas.style.height = `${result.height * scale}px`;
  drawPixels(canvas, result.pixels, result.width, result.height);
  cell.insertBefore(canvas, cell.firstChild);
}
