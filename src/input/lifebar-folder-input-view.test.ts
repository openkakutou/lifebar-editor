import { afterEach, describe, expect, it, vi } from "vitest";
import { initAppI18n } from "../i18n/i18n.ts";
import type { LifebarDocument } from "../lifebar/document.ts";
import { renderLifebarFolderInput } from "./lifebar-folder-input-view.ts";

function makeFile(name: string, contents = "x"): File {
  return new File([contents], name);
}

function withRelativePath(file: File, relativePath: string): File {
  Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
  return file;
}

function fakeFileEntry(fullPath: string, file: File) {
  return {
    isFile: true,
    isDirectory: false,
    fullPath,
    file: (success: (file: File) => void) => success(file),
  };
}

/** jsdom's DragEvent does not implement DataTransfer, so it is stubbed directly. */
function dispatchDrop(target: Element, entries: unknown[]): void {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: {
      items: entries.map((entry) => ({ webkitGetAsEntry: () => entry })),
    },
  });
  target.dispatchEvent(event);
}

function picker(root: HTMLElement): HTMLInputElement {
  return root.querySelector('input[type="file"]') as HTMLInputElement;
}

function status(root: HTMLElement): HTMLElement {
  return root.querySelector('[role="status"]') as HTMLElement;
}

function dropZone(root: HTMLElement): HTMLElement {
  return root.querySelector(".lifebar-folder-input__dropzone") as HTMLElement;
}

async function selectViaPicker(
  root: HTMLElement,
  files: File[],
): Promise<void> {
  const input = picker(root);
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => {
    if (status(root).textContent === "Reading…")
      throw new Error("still loading");
  });
}

describe("renderLifebarFolderInput", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a folder-specific prompt in the idle state, not a generic file prompt", () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, { onLoaded: vi.fn() });

    expect(root.textContent?.toLowerCase()).toContain("folder");
    expect(picker(root).getAttribute("webkitdirectory")).not.toBeNull();
  });

  it("auto-loads and reports success when exactly one candidate is picked", async () => {
    const onLoaded = vi.fn();
    const root = document.createElement("div");
    renderLifebarFolderInput(root, {
      onLoaded,
      fileOptions: { readFileText: async () => "[Info]\nname = Default\n" },
    });

    await selectViaPicker(root, [
      withRelativePath(makeFile("fight.def"), "pack/fight.def"),
    ]);

    const [parsedDocument, fileName] = onLoaded.mock.calls[0] as [
      LifebarDocument,
      string,
    ];
    expect(fileName).toBe("fight.def");
    expect(parsedDocument.sections).toHaveLength(1);
    expect(status(root).textContent).toContain("fight.def");
    expect(status(root).textContent).toContain("1");
  });

  it("shows a distinct error when the selected folder is empty", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, { onLoaded: vi.fn() });

    await selectViaPicker(root, []);

    expect(status(root).textContent?.toLowerCase()).toContain("empty");
  });

  it("shows the same error treatment as a malformed file when the folder has no candidate lifebar file", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, { onLoaded: vi.fn() });

    await selectViaPicker(root, [
      withRelativePath(makeFile("font.fnt"), "pack/font.fnt"),
    ]);

    expect(status(root).textContent?.toLowerCase()).toContain(".def");
    expect(
      status(root).classList.contains("lifebar-folder-input__status--error"),
    ).toBe(true);
  });

  it("prompts with a keyboard-navigable choice labeled by relative path when multiple candidates exist, and does not auto-load", async () => {
    const onLoaded = vi.fn();
    const root = document.createElement("div");
    renderLifebarFolderInput(root, {
      onLoaded,
      fileOptions: { readFileText: async () => "[Round]\npos = 1,1\n" },
    });

    await selectViaPicker(root, [
      withRelativePath(makeFile("fight.def"), "pack/fight.def"),
      withRelativePath(makeFile("fight2.def"), "pack/alt/fight2.def"),
    ]);

    const options = root.querySelectorAll('input[type="radio"]');
    expect(options).toHaveLength(2);
    expect(root.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(root.textContent).toContain("pack/fight.def");
    expect(root.textContent).toContain("pack/alt/fight2.def");
    expect(onLoaded).not.toHaveBeenCalled();

    const confirmButton = root.querySelector(
      "wuik-button[data-action='confirm-selection']",
    ) as HTMLElement;
    expect(confirmButton.hasAttribute("disabled")).toBe(true);

    (options[1] as HTMLInputElement).click();
    expect(confirmButton.hasAttribute("disabled")).toBe(false);

    confirmButton.dispatchEvent(new Event("click", { bubbles: true }));
    await vi.waitFor(() => {
      expect(onLoaded).toHaveBeenCalled();
    });

    const [, fileName] = onLoaded.mock.calls[0] as [LifebarDocument, string];
    expect(fileName).toBe("fight2.def");
  });

  it("reports a read failure distinctly from a parse failure", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, {
      onLoaded: vi.fn(),
      fileOptions: {
        readFileText: async () => {
          throw new Error("disk gremlin");
        },
      },
    });

    await selectViaPicker(root, [
      withRelativePath(makeFile("fight.def"), "pack/fight.def"),
    ]);

    expect(status(root).textContent).toContain("disk gremlin");
    expect(status(root).textContent?.toLowerCase()).toContain("read");
  });

  it("reports a parse failure naming the file", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, {
      onLoaded: vi.fn(),
      fileOptions: { readFileText: async () => "[Info\nname = x\n" },
    });

    await selectViaPicker(root, [
      withRelativePath(makeFile("fight.def"), "pack/fight.def"),
    ]);

    expect(status(root).textContent?.toLowerCase()).toContain("line 1");
    expect(status(root).textContent).toContain("fight.def");
  });

  it("distinguishes a drag-and-drop that yielded nothing from an empty picker selection", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, { onLoaded: vi.fn() });

    dispatchDrop(dropZone(root), []);
    await vi.waitFor(() => {
      if (status(root).textContent === "") throw new Error("not yet updated");
    });

    expect(status(root).textContent?.toLowerCase()).toContain("browser");
  });

  it("recursively gathers files from a dropped folder and auto-loads the sole candidate", async () => {
    const onLoaded = vi.fn();
    const root = document.createElement("div");
    renderLifebarFolderInput(root, {
      onLoaded,
      fileOptions: { readFileText: async () => "[Info]\nname = Default\n" },
    });

    dispatchDrop(dropZone(root), [
      fakeFileEntry("/pack/fight.def", makeFile("fight.def")),
    ]);

    await vi.waitFor(() => {
      expect(onLoaded).toHaveBeenCalled();
    });
    const [, fileName] = onLoaded.mock.calls[0] as [LifebarDocument, string];
    expect(fileName).toBe("fight.def");
  });

  it("always offers a way to choose a different folder once a result is shown", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, {
      onLoaded: vi.fn(),
      fileOptions: { readFileText: async () => "[Info]\nname = Default\n" },
    });

    await selectViaPicker(root, [
      withRelativePath(makeFile("fight.def"), "pack/fight.def"),
    ]);

    const resetButton = root.querySelector(
      "wuik-button[data-action='reset']",
    ) as HTMLElement;
    expect(resetButton).not.toBeNull();

    resetButton.click();

    expect(status(root).textContent).toBe("");
    expect(root.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("returns cleanly to idle when reset is clicked mid-selection, with no stale status left behind", async () => {
    const root = document.createElement("div");
    renderLifebarFolderInput(root, { onLoaded: vi.fn() });

    await selectViaPicker(root, [
      withRelativePath(makeFile("fight.def"), "pack/fight.def"),
      withRelativePath(makeFile("fight2.def"), "pack/alt/fight2.def"),
    ]);
    expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(2);

    const resetButton = root.querySelector(
      "wuik-button[data-action='reset']",
    ) as HTMLElement;
    resetButton.click();

    expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(status(root).textContent).toBe("");
  });

  describe("live locale switching (backlog item 009)", () => {
    afterEach(async () => {
      window.localStorage.clear();
    });

    it("re-translates an already-shown success status in place, without re-reading the file", async () => {
      const instance = await initAppI18n();
      await instance.changeLanguage("en");
      const root = document.createElement("div");
      renderLifebarFolderInput(root, {
        onLoaded: vi.fn(),
        fileOptions: { readFileText: async () => "[Info]\nname = Default\n" },
      });

      await selectViaPicker(root, [
        withRelativePath(makeFile("fight.def"), "pack/fight.def"),
      ]);

      await instance.changeLanguage("fr");

      await vi.waitFor(() => {
        const text = status(root).textContent ?? "";
        expect(text).toContain("chargé");
      });
      expect(status(root).textContent).toContain("fight.def");

      await instance.changeLanguage("en");
    });

    it("re-translates the static label and hint text", async () => {
      const instance = await initAppI18n();
      await instance.changeLanguage("en");
      const root = document.createElement("div");
      renderLifebarFolderInput(root, { onLoaded: vi.fn() });

      await instance.changeLanguage("fr");
      await vi.waitFor(() => {
        expect(root.textContent).toContain("dossier");
      });

      await instance.changeLanguage("en");
    });
  });
});
