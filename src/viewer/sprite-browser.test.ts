import { describe, expect, it, vi } from "vitest";
import type { SpritePixelResult } from "../wasm/bridge.ts";
import type { SpriteGroup } from "../wasm/types.ts";
import { renderSpriteBrowser } from "./sprite-browser.ts";

function spriteGroups(): SpriteGroup[] {
  return [
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
        {
          group: 0,
          image: 1,
          width: 20,
          height: 20,
          axisX: 10,
          axisY: 10,
          palette: 0,
        },
      ],
    },
    {
      index: 1,
      sprites: [
        {
          group: 1,
          image: 0,
          width: 300,
          height: 400,
          axisX: 0,
          axisY: 0,
          palette: 0,
        },
      ],
    },
  ];
}

const sffBytes = new Uint8Array([1, 2, 3]);

function pixelResult(width: number, height: number): SpritePixelResult {
  return {
    ok: true,
    pixels: new Uint8Array(width * height * 4),
    width,
    height,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function groupToggle(root: HTMLElement, index: number): HTMLButtonElement {
  return root.querySelectorAll<HTMLButtonElement>(
    ".sprite-browser__group-toggle",
  )[index];
}

describe("renderSpriteBrowser", () => {
  it("renders nothing when no sprite sheet is loaded", () => {
    const root = document.createElement("div");
    renderSpriteBrowser(root, null, null);
    expect(root.children).toHaveLength(0);
  });

  it("shows an explicit empty state for a sheet with no sprites", () => {
    const root = document.createElement("div");
    renderSpriteBrowser(root, [], sffBytes);
    expect(root.textContent).toContain("No sprites");
  });

  it("lists every group collapsed, each labeled with its sprite count", () => {
    const root = document.createElement("div");
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels: vi.fn(),
    });

    const toggles = root.querySelectorAll(".sprite-browser__group-toggle");
    expect(toggles).toHaveLength(2);
    expect(toggles[0].textContent).toContain("Group 0");
    expect(toggles[0].textContent).toContain("2");
    expect(toggles[1].textContent).toContain("Group 1");
    expect(toggles[1].textContent).toContain("1");
    expect(root.querySelectorAll(".sprite-browser__thumb")).toHaveLength(0);
  });

  it("shows every sprite's label immediately on expand, before the batch decode resolves", async () => {
    const root = document.createElement("div");
    const { promise } = deferred<SpritePixelResult[]>();
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels: vi.fn().mockReturnValue(promise),
    });

    groupToggle(root, 0).click();

    const cells = root.querySelectorAll(".sprite-browser__thumb");
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toContain("0, 0");
    expect(cells[0].textContent).toContain("57");
    expect(cells[0].textContent).toContain("103");
    expect(cells[0].querySelector(".sprite-browser__skeleton")).not.toBeNull();
    expect(cells[0].querySelector("canvas")).toBeNull();
  });

  it("batches every sprite of the expanded group into a single decode call", () => {
    const root = document.createElement("div");
    const resolveSpritePixels = vi.fn().mockReturnValue(new Promise(() => {}));
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels,
    });

    groupToggle(root, 0).click();

    expect(resolveSpritePixels).toHaveBeenCalledOnce();
    expect(resolveSpritePixels).toHaveBeenCalledWith(
      sffBytes,
      [
        [0, 0],
        [0, 1],
      ],
      null,
      undefined,
    );
  });

  it("replaces each skeleton with a drawn thumbnail once the batch resolves", async () => {
    const root = document.createElement("div");
    const { promise, resolve } = deferred<SpritePixelResult[]>();
    const drawPixels = vi.fn();
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels: vi.fn().mockReturnValue(promise),
      drawPixels,
    });

    groupToggle(root, 0).click();
    resolve([pixelResult(57, 103), pixelResult(20, 20)]);
    await promise;
    await Promise.resolve();

    const cells = root.querySelectorAll(".sprite-browser__thumb");
    expect(cells[0].querySelector(".sprite-browser__skeleton")).toBeNull();
    expect(cells[0].querySelector("canvas")).not.toBeNull();
    expect(drawPixels).toHaveBeenCalledTimes(2);
  });

  it("shows a per-sprite error tile for a sprite that failed within an otherwise-successful batch", async () => {
    const root = document.createElement("div");
    const { promise, resolve } = deferred<SpritePixelResult[]>();
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels: vi.fn().mockReturnValue(promise),
      drawPixels: vi.fn(),
    });

    groupToggle(root, 0).click();
    resolve([pixelResult(57, 103), { ok: false, error: "corrupt pixel data" }]);
    await promise;
    await Promise.resolve();

    const cells = root.querySelectorAll(".sprite-browser__thumb");
    expect(cells[0].querySelector("canvas")).not.toBeNull();
    expect(cells[1].querySelector("canvas")).toBeNull();
    expect(cells[1].textContent).toContain("corrupt pixel data");
  });

  it("does not re-trigger the batch decode when a group is collapsed then re-expanded", async () => {
    const root = document.createElement("div");
    const resolveSpritePixels = vi
      .fn()
      .mockResolvedValue([pixelResult(57, 103), pixelResult(20, 20)]);
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels,
      drawPixels: vi.fn(),
    });

    const toggle = groupToggle(root, 0);
    toggle.click(); // expand
    await Promise.resolve();
    await Promise.resolve();
    toggle.click(); // collapse
    toggle.click(); // re-expand

    expect(resolveSpritePixels).toHaveBeenCalledOnce();
    expect(
      root
        .querySelectorAll(".sprite-browser__thumb")[0]
        .querySelector("canvas"),
    ).not.toBeNull();
  });

  it("scopes each group's decode call to only that group's own sprites", () => {
    const root = document.createElement("div");
    const resolveSpritePixels = vi.fn().mockReturnValue(new Promise(() => {}));
    renderSpriteBrowser(root, spriteGroups(), sffBytes, {
      resolveSpritePixels,
    });

    groupToggle(root, 1).click();

    expect(resolveSpritePixels).toHaveBeenCalledWith(
      sffBytes,
      [[1, 0]],
      null,
      undefined,
    );
  });
});
