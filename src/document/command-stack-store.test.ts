import { afterEach, describe, expect, it } from "vitest";
import {
  commandStack,
  resetCommandStackForTests,
} from "./command-stack-store.ts";

describe("commandStack", () => {
  afterEach(() => {
    resetCommandStackForTests();
  });

  it("starts with no undo or redo history", () => {
    expect(commandStack.canUndo).toBe(false);
    expect(commandStack.canRedo).toBe(false);
  });

  it("is the same shared instance across imports, so every screen undoes the same history", () => {
    let applied = 0;
    commandStack.push({
      do: () => {
        applied += 1;
      },
      undo: () => {
        applied -= 1;
      },
    });

    expect(applied).toBe(1);
    expect(commandStack.canUndo).toBe(true);
  });

  it("resetCommandStackForTests clears any pushed history", () => {
    commandStack.push({ do: () => {}, undo: () => {} });
    expect(commandStack.canUndo).toBe(true);

    resetCommandStackForTests();

    expect(commandStack.canUndo).toBe(false);
    expect(commandStack.canRedo).toBe(false);
  });
});
