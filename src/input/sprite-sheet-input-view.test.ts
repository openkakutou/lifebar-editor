import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSpriteSheetInput } from "./sprite-sheet-input-view.ts";

function makeFile(name: string, contents = "x"): File {
  return new File([contents], name);
}

function picker(root: HTMLElement): HTMLInputElement {
  return root.querySelector('input[type="file"]') as HTMLInputElement;
}

function status(root: HTMLElement): HTMLElement {
  return root.querySelector('[role="status"]') as HTMLElement;
}

function dropZone(root: HTMLElement): HTMLElement {
  return root.querySelector(".sprite-sheet-input__dropzone") as HTMLElement;
}

/** jsdom's DragEvent does not implement DataTransfer, so it is stubbed directly. */
function dispatchDrop(target: Element, files: File[]): void {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files } });
  target.dispatchEvent(event);
}

describe("renderSpriteSheetInput", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a file picker and drop zone in the idle state", () => {
    const root = document.createElement("div");
    renderSpriteSheetInput(root, { onLoaded: vi.fn() });

    expect(picker(root)).not.toBeNull();
    expect(status(root).textContent).toBe("");
  });

  it("loads a valid sprite sheet, shows the browser, and reports success", async () => {
    const onLoaded = vi.fn();
    const root = document.createElement("div");
    const spriteGroups = [{ index: 0, sprites: [] }];
    renderSpriteSheetInput(root, {
      onLoaded,
      fileOptions: {
        readFileBytes: async () => new Uint8Array([1, 2, 3]),
        loadSpriteSheet: async () => ({ ok: true, spriteGroups }),
      },
    });

    const input = picker(root);
    Object.defineProperty(input, "files", {
      value: [makeFile("cyclops.sff")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => {
      if (status(root).textContent === "Reading…")
        throw new Error("still loading");
    });

    expect(status(root).textContent).toContain("cyclops.sff");
    expect(onLoaded).toHaveBeenCalledWith({
      fileName: "cyclops.sff",
      sffBytes: new Uint8Array([1, 2, 3]),
      spriteGroups,
    });
    expect(root.querySelector(".sprite-browser")).not.toBeNull();
  });

  it("shows a read-error naming the file when reading its bytes fails", async () => {
    const root = document.createElement("div");
    renderSpriteSheetInput(root, {
      onLoaded: vi.fn(),
      fileOptions: {
        readFileBytes: async () => {
          throw new Error("disk gremlin");
        },
      },
    });

    const input = picker(root);
    Object.defineProperty(input, "files", {
      value: [makeFile("cyclops.sff")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => {
      if (status(root).textContent === "Reading…")
        throw new Error("still loading");
    });

    expect(status(root).textContent).toContain("cyclops.sff");
    expect(status(root).textContent).toContain("disk gremlin");
    expect(status(root).textContent?.toLowerCase()).toContain("read");
  });

  it("shows a setup-error with guidance to download the WASM build when the module can't start", async () => {
    const root = document.createElement("div");
    renderSpriteSheetInput(root, {
      onLoaded: vi.fn(),
      fileOptions: {
        readFileBytes: async () => new Uint8Array([1]),
        loadSpriteSheet: async () => {
          throw new Error("failed to fetch ./wasm/sff.wasm: 404 Not Found");
        },
      },
    });

    const input = picker(root);
    Object.defineProperty(input, "files", {
      value: [makeFile("cyclops.sff")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => {
      if (status(root).textContent === "Reading…")
        throw new Error("still loading");
    });

    expect(status(root).textContent).toContain("404 Not Found");
    expect(status(root).textContent).toContain("wasm:download");
  });

  it("shows a parse-error naming the file when the module reports a malformed sheet", async () => {
    const root = document.createElement("div");
    renderSpriteSheetInput(root, {
      onLoaded: vi.fn(),
      fileOptions: {
        readFileBytes: async () => new Uint8Array([1]),
        loadSpriteSheet: async () => ({
          ok: false,
          error: "sff: not a .sff file: unexpected signature",
        }),
      },
    });

    const input = picker(root);
    Object.defineProperty(input, "files", {
      value: [makeFile("cyclops.sff")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => {
      if (status(root).textContent === "Reading…")
        throw new Error("still loading");
    });

    expect(status(root).textContent).toContain("cyclops.sff");
    expect(status(root).textContent).toContain("unexpected signature");
    expect(status(root).textContent?.toLowerCase()).toContain("parse");
  });

  it("loads a dropped file the same way as a picked one", async () => {
    const onLoaded = vi.fn();
    const root = document.createElement("div");
    renderSpriteSheetInput(root, {
      onLoaded,
      fileOptions: {
        readFileBytes: async () => new Uint8Array([9]),
        loadSpriteSheet: async () => ({ ok: true, spriteGroups: [] }),
      },
    });

    dispatchDrop(dropZone(root), [makeFile("kfm.sff")]);
    await vi.waitFor(() => {
      expect(onLoaded).toHaveBeenCalled();
    });

    expect(onLoaded).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "kfm.sff" }),
    );
  });

  it("replaces the previous result wholesale when a new file is loaded", async () => {
    const onLoaded = vi.fn();
    const root = document.createElement("div");
    let call = 0;
    renderSpriteSheetInput(root, {
      onLoaded,
      fileOptions: {
        readFileBytes: async () => new Uint8Array([1]),
        loadSpriteSheet: async () => {
          call++;
          return {
            ok: true,
            spriteGroups: [{ index: call, sprites: [] }],
          };
        },
      },
    });

    const input = picker(root);
    Object.defineProperty(input, "files", {
      value: [makeFile("first.sff")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));

    Object.defineProperty(input, "files", {
      value: [makeFile("second.sff")],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(2));

    expect(status(root).textContent).toContain("second.sff");
    expect(root.querySelectorAll(".sprite-browser")).toHaveLength(1);
  });
});
