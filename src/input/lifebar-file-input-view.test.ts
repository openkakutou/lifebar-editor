import { describe, expect, it, vi } from "vitest";
import type { LifebarDocument } from "../lifebar/document.ts";
import { renderLifebarFileInput } from "./lifebar-file-input-view.ts";

function fileFromText(name: string, text: string): File {
  return new File([text], name, { type: "text/plain" });
}

function dispatchDrop(dropZone: Element, files: File[]): void {
  const dataTransfer = { files } as unknown as DataTransfer;
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  dropZone.dispatchEvent(event);
}

describe("renderLifebarFileInput", () => {
  it("shows a dropzone and native file picker before anything is loaded", () => {
    const root = document.createElement("div");
    renderLifebarFileInput(root, { onLoaded: vi.fn() });

    expect(root.querySelector(".lifebar-input__dropzone")).not.toBeNull();
    expect(
      root.querySelector<HTMLInputElement>('input[type="file"]'),
    ).not.toBeNull();
  });

  it("shows a success status naming the file and the number of sections found", async () => {
    const root = document.createElement("div");
    const onLoaded = vi.fn();
    renderLifebarFileInput(root, { onLoaded });

    const dropZone = root.querySelector(".lifebar-input__dropzone");
    if (!dropZone) throw new Error("dropzone not found");
    dispatchDrop(dropZone, [
      fileFromText("fight.def", "[Info]\nname = Default\n[Round]\npos = 1,1\n"),
    ]);

    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));

    const [parsedDocument, fileName] = onLoaded.mock.calls[0] as [
      LifebarDocument,
      string,
    ];
    expect(fileName).toBe("fight.def");
    expect(parsedDocument.sections).toHaveLength(2);

    const status = root.querySelector(".lifebar-input__status");
    expect(status?.textContent).toContain("fight.def");
    expect(status?.textContent).toContain("2");
  });

  it("shows a clear parse-error status without crashing, and does not call onLoaded", async () => {
    const root = document.createElement("div");
    const onLoaded = vi.fn();
    renderLifebarFileInput(root, { onLoaded });

    const dropZone = root.querySelector(".lifebar-input__dropzone");
    if (!dropZone) throw new Error("dropzone not found");
    dispatchDrop(dropZone, [fileFromText("fight.def", "[Info\nname = x\n")]);

    await vi.waitFor(() => {
      const status = root.querySelector(".lifebar-input__status");
      expect(status?.textContent).toContain("line 1");
    });
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("replaces a previous success with a new file's outcome, wholesale, not merged", async () => {
    const root = document.createElement("div");
    const onLoaded = vi.fn();
    renderLifebarFileInput(root, { onLoaded });

    const dropZone = root.querySelector(".lifebar-input__dropzone");
    if (!dropZone) throw new Error("dropzone not found");
    dispatchDrop(dropZone, [fileFromText("first.def", "[Info]\nname = A\n")]);
    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));

    dispatchDrop(dropZone, [
      fileFromText("second.def", "[Info]\nname = B\n[Round]\npos = 1,1\n"),
    ]);
    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(2));

    const status = root.querySelector(".lifebar-input__status");
    expect(status?.textContent).toContain("second.def");
    expect(status?.textContent).not.toContain("first.def");
  });

  it("replaces a previous error with a new drop's outcome", async () => {
    const root = document.createElement("div");
    renderLifebarFileInput(root, { onLoaded: vi.fn() });

    const dropZone = root.querySelector(".lifebar-input__dropzone");
    if (!dropZone) throw new Error("dropzone not found");
    dispatchDrop(dropZone, [fileFromText("bad.def", "[Info\nname = x\n")]);
    await vi.waitFor(() => {
      expect(
        root.querySelector(".lifebar-input__status")?.textContent,
      ).toContain("line 1");
    });

    dispatchDrop(dropZone, [fileFromText("good.def", "[Info]\nname = x\n")]);
    await vi.waitFor(() => {
      expect(
        root.querySelector(".lifebar-input__status")?.textContent,
      ).toContain("good.def");
    });
  });
});
