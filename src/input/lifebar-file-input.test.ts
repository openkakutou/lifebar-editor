import { describe, expect, it } from "vitest";
import { loadLifebarFromFile } from "./lifebar-file-input.ts";

function fileFromText(name: string, text: string): File {
  return new File([text], name, { type: "text/plain" });
}

describe("loadLifebarFromFile", () => {
  it("reads a well-formed file and returns its parsed document plus the file name", async () => {
    const file = fileFromText("fight.def", "[Info]\nname = Default\n");

    const result = await loadLifebarFromFile(file);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.fileName).toBe("fight.def");
    expect(result.document.sections).toHaveLength(1);
    expect(result.document.sections[0].name).toBe("Info");
  });

  it("returns a parse-error status with the parser's own message for malformed content", async () => {
    const file = fileFromText("fight.def", "[Info\nname = Default\n");

    const result = await loadLifebarFromFile(file);

    expect(result.status).toBe("parse-error");
    if (result.status !== "parse-error")
      throw new Error("expected parse-error");
    expect(result.message).toContain("line 1");
  });

  it("returns a read-error status instead of throwing when the file cannot be read", async () => {
    const file = fileFromText("fight.def", "[Info]\nname = Default\n");

    const result = await loadLifebarFromFile(file, {
      readFileText: async () => {
        throw new Error("simulated unreadable file");
      },
    });

    expect(result.status).toBe("read-error");
    if (result.status !== "read-error") throw new Error("expected read-error");
    expect(result.message).toContain("simulated unreadable file");
  });

  it("treats an empty file as a successful, empty document rather than an error", async () => {
    const file = fileFromText("fight.def", "");

    const result = await loadLifebarFromFile(file);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.document.sections).toEqual([]);
  });
});
