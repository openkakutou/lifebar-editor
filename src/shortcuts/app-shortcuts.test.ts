import { ShortcutManager } from "@openkakutou/web-ui-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_SHORTCUT_ACTIONS,
  type AppShortcutHandlers,
  handleAppShortcutKeydown,
  isEditableTarget,
  registerAppShortcuts,
  resolveAppShortcutActionId,
} from "./app-shortcuts.ts";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
}

function newManager(): ShortcutManager {
  const manager = new ShortcutManager({ storage: memoryStorage() });
  registerAppShortcuts(manager);
  return manager;
}

function keyEvent(
  init: Partial<{
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    target: EventTarget;
  }>,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: init.key ?? "a",
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    cancelable: true,
  });
  if (init.target !== undefined) {
    Object.defineProperty(event, "target", { value: init.target });
  }
  return event;
}

describe("registerAppShortcuts", () => {
  it("registers Save/Export, Undo, and Redo with their default bindings", () => {
    const manager = new ShortcutManager({ storage: memoryStorage() });

    registerAppShortcuts(manager);

    const bindings = manager.list();
    expect(bindings).toEqual([
      {
        id: "save-export",
        label: "Save / Export",
        key: "Ctrl+S",
        isDefault: true,
      },
      { id: "undo", label: "Undo", key: "Ctrl+Z", isDefault: true },
      { id: "redo", label: "Redo", key: "Ctrl+Y", isDefault: true },
    ]);
  });

  it("exposes the same three actions as APP_SHORTCUT_ACTIONS, in order", () => {
    expect(APP_SHORTCUT_ACTIONS.map((a) => a.id)).toEqual([
      "save-export",
      "undo",
      "redo",
    ]);
  });
});

describe("isEditableTarget", () => {
  it("is true for a text input", () => {
    expect(isEditableTarget(document.createElement("input"))).toBe(true);
  });

  it("is true for a contenteditable element", () => {
    const el = document.createElement("div");
    el.setAttribute("contenteditable", "true");
    document.body.appendChild(el);
    expect(isEditableTarget(el)).toBe(true);
    el.remove();
  });

  it("is true for a plain child of a contenteditable region (inherited editability)", () => {
    const host = document.createElement("div");
    host.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    host.appendChild(child);
    document.body.appendChild(host);
    expect(isEditableTarget(child)).toBe(true);
    host.remove();
  });

  it("is false for a plain button", () => {
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
  });

  it("is false for null", () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("resolveAppShortcutActionId", () => {
  it("resolves the default Ctrl+S combo to the save-export action", () => {
    const manager = newManager();
    expect(
      resolveAppShortcutActionId(
        manager,
        keyEvent({ key: "s", ctrlKey: true }),
      ),
    ).toBe("save-export");
  });

  it("resolves a combo rebound by the user, not just the original default", () => {
    const manager = newManager();
    manager.rebind("undo", "Ctrl+U");

    expect(
      resolveAppShortcutActionId(
        manager,
        keyEvent({ key: "z", ctrlKey: true }),
      ),
    ).toBeUndefined();
    expect(
      resolveAppShortcutActionId(
        manager,
        keyEvent({ key: "u", ctrlKey: true }),
      ),
    ).toBe("undo");
  });

  it("returns undefined for a combo pressed on its own with no matching action", () => {
    const manager = newManager();
    expect(
      resolveAppShortcutActionId(manager, keyEvent({ key: "a" })),
    ).toBeUndefined();
  });

  it("returns undefined when only a modifier key is pressed", () => {
    const manager = newManager();
    expect(
      resolveAppShortcutActionId(
        manager,
        keyEvent({ key: "Control", ctrlKey: true }),
      ),
    ).toBeUndefined();
  });
});

describe("handleAppShortcutKeydown", () => {
  let handlers: AppShortcutHandlers;

  beforeEach(() => {
    handlers = {
      onSaveExport: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    };
  });

  it("calls onSaveExport and prevents the default browser Save dialog on Ctrl+S", () => {
    const manager = newManager();
    const event = keyEvent({
      key: "s",
      ctrlKey: true,
      target: document.createElement("body"),
    });

    const handled = handleAppShortcutKeydown(event, manager, handlers);

    expect(handled).toBe(true);
    expect(handlers.onSaveExport).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("calls onSaveExport even while focus is inside a text field", () => {
    const manager = newManager();
    const input = document.createElement("input");
    const event = keyEvent({ key: "s", ctrlKey: true, target: input });

    handleAppShortcutKeydown(event, manager, handlers);

    expect(handlers.onSaveExport).toHaveBeenCalledOnce();
  });

  it("does not call onUndo when focus is inside a text field, and leaves the event unhandled", () => {
    const manager = newManager();
    const input = document.createElement("input");
    const event = keyEvent({ key: "z", ctrlKey: true, target: input });

    const handled = handleAppShortcutKeydown(event, manager, handlers);

    expect(handled).toBe(false);
    expect(handlers.onUndo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("calls onUndo when focus is outside any text field", () => {
    const manager = newManager();
    const event = keyEvent({
      key: "z",
      ctrlKey: true,
      target: document.createElement("body"),
    });

    const handled = handleAppShortcutKeydown(event, manager, handlers);

    expect(handled).toBe(true);
    expect(handlers.onUndo).toHaveBeenCalledOnce();
  });

  it("does nothing and reports unhandled for a key combo bound to no action", () => {
    const manager = newManager();
    const event = keyEvent({
      key: "x",
      ctrlKey: true,
      target: document.createElement("body"),
    });

    const handled = handleAppShortcutKeydown(event, manager, handlers);

    expect(handled).toBe(false);
    expect(handlers.onSaveExport).not.toHaveBeenCalled();
    expect(handlers.onUndo).not.toHaveBeenCalled();
    expect(handlers.onRedo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("follows a live rebind: redo moved onto Ctrl+S no longer fires save-export from that combo", () => {
    const manager = newManager();
    manager.rebind("redo", "Ctrl+S", { swap: true });
    const event = keyEvent({
      key: "s",
      ctrlKey: true,
      target: document.createElement("body"),
    });

    handleAppShortcutKeydown(event, manager, handlers);

    expect(handlers.onRedo).toHaveBeenCalledOnce();
    expect(handlers.onSaveExport).not.toHaveBeenCalled();
  });
});
