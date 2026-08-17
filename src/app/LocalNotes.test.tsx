import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LocalNotes } from "./LocalNotes";
import styles from "./page.module.css";
import { GRID, NOTE_COL_SPAN, NOTE_ROW_SPAN } from "./noteTypes";

const NARROW_VIEWPORT_QUERY = "(max-width: 760px)";
const PAGE_CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.module.css"), "utf8");
const LOCAL_NOTES_TSX = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "LocalNotes.tsx"), "utf8");

function cssRuleZIndex(className: string) {
  const match = PAGE_CSS.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`));
  const zIndex = match?.[1].match(/z-index:\s*(-?\d+)/)?.[1];
  if (zIndex === undefined) {
    throw new Error(`Expected .${className} to declare z-index`);
  }
  return Number.parseInt(zIndex, 10);
}

function cssRuleBody(className: string) {
  const match = PAGE_CSS.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`));
  if (!match) {
    throw new Error(`Expected .${className} to exist`);
  }
  return match[1];
}

function mockViewport(isNarrow: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === NARROW_VIEWPORT_QUERY ? isNarrow : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("LocalNotes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockViewport(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("adds a note from the bottom button and stores it", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "New note" }));
    expect(screen.queryByRole("button", { name: "Stick it" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Edit note"), "只给自己看的想法");
    await user.tab();

    expect(screen.getByText("只给自己看的想法")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("只给自己看的想法");
  });

  test("shows empty state copy when there are no notes", async () => {
    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("Write a note just for yourself...")).toBeInTheDocument();
  });

  test("hides empty state after adding a note", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await screen.findByText("Write a note just for yourself...");
    await user.click(screen.getByRole("button", { name: "New note" }));

    expect(screen.queryByText("Write a note just for yourself...")).not.toBeInTheDocument();
  });

  test("creates an editable note when clicking the empty state note", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(await screen.findByRole("button", { name: "Start your first note" }));

    expect(screen.getByLabelText("Edit note")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start your first note" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Edit note"), "从空状态写起");
    await user.tab();

    expect(screen.getByText("从空状态写起")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("从空状态写起");
  });

  test("prevents selecting note text until the note is being edited", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "不能随便选中", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const noteText = await screen.findByText("不能随便选中");

    const blocked = new Event("selectstart", { bubbles: true, cancelable: true });
    noteText.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Edit note: 不能随便选中" }));
    const editor = screen.getByLabelText("Edit note");
    const allowed = new Event("selectstart", { bubbles: true, cancelable: true });
    editor.dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
  });

  test("shows only one add note button in the toolbar", () => {
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getAllByRole("button", { name: "New note" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Old add note comparison" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Combined add note comparison" })).not.toBeInTheDocument();
    expect(cssRuleBody("addNoteButton")).toContain("font-weight: 500;");
  });

  test("keeps organize and clear inside the hover more menu", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const toolbar = screen.getByRole("toolbar", { name: "New note toolbar" });
    const moreMenu = screen.getByLabelText("More actions");

    expect(screen.queryByText("Organize")).not.toBeInTheDocument();
    expect(Array.from(toolbar.children)).toEqual([
      screen.getByRole("button", { name: "New note" }),
      moreMenu,
    ]);

    await user.hover(moreMenu);

    expect(screen.getByLabelText("More actions options")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Organize notes" })).toHaveTextContent("Organize");
    expect(screen.getByRole("button", { name: "Clear all notes" })).toHaveTextContent("Clear");
    expect(screen.getByRole("button", { name: "Clear all notes" }).className).not.toContain("toolbarDangerActionButton");
    expect(cssRuleBody("toolbarActionButton")).toContain("border: 1px solid");
    expect(cssRuleBody("toolbarActionButton")).toContain("color: rgba(17, 18, 23, 0.58);");
    expect(cssRuleBody("toolbarActionMenu")).not.toContain("border-bottom");
  });

  test("keeps storage help out of the more menu", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.hover(screen.getByLabelText("More actions"));

    expect(screen.queryByRole("button", { name: "Storage help" })).not.toBeInTheDocument();
  });

  test("organizes notes by visual position without changing editable labels", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([
        { id: "note-bottom-left", text: "下面的", tone: "yellow", label: "自定义", col: 1, row: 16 },
        { id: "note-top-right", text: "右上的", tone: "green", label: "B-7", col: 20, row: 2 },
        { id: "note-top-left", text: "左上的", tone: "blue", label: "A1", col: 3, row: 1 },
      ]),
    );

    render(<LocalNotes initialIndex={0} />);

    const topLeftNote = (await screen.findByText("左上的")).closest("section");
    const topRightNote = screen.getByText("右上的").closest("section");
    const bottomLeftNote = screen.getByText("下面的").closest("section");

    await user.hover(screen.getByLabelText("More actions"));
    await user.click(screen.getByRole("button", { name: "Organize notes" }));

    expect(topLeftNote).toHaveStyle({ left: `${1 * GRID}px`, top: `${1 * GRID}px` });
    expect(topRightNote).toHaveStyle({ left: `${8 * GRID}px`, top: `${1 * GRID}px` });
    expect(bottomLeftNote).toHaveStyle({ left: `${1 * GRID}px`, top: `${7 * GRID}px` });

    const stored = window.localStorage.getItem("sticky-notes.local-notes");
    expect(stored).toContain('"label":"A1"');
    expect(stored).toContain('"label":"B-7"');
    expect(stored).toContain('"label":"自定义"');
  });

  test("clears all notes only after confirming in a dialog", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([
        { id: "note-1", text: "第一条", tone: "yellow", label: "A1", col: 1, row: 1 },
        { id: "note-2", text: "第二条", tone: "green", label: "B2", col: 8, row: 1 },
      ]),
    );

    render(<LocalNotes initialIndex={0} />);
    expect(await screen.findByText("第一条")).toBeInTheDocument();

    await user.hover(screen.getByLabelText("More actions"));
    await user.click(screen.getByRole("button", { name: "Clear all notes" }));

    expect(screen.getByRole("dialog", { name: "Delete all notes?" })).toBeInTheDocument();
    expect(screen.getByText("This will remove every note from this browser.")).toBeInTheDocument();
    expect(screen.getByText("第一条")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete all" }));

    expect(screen.queryByText("第一条")).not.toBeInTheDocument();
    expect(screen.queryByText("第二条")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toBe("[]");
  });

  test("submits a note with Enter", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "New note" }));
    await user.type(screen.getByLabelText("Edit note"), "回车贴上去{Enter}");

    expect(screen.getByText("回车贴上去")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("回车贴上去");
  });

  test("keeps a newline with Shift Enter", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "New note" }));
    await user.type(screen.getByLabelText("Edit note"), "第一行{Shift>}{Enter}{/Shift}第二行");

    expect(screen.queryByText("第一行")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Edit note")).toHaveValue("第一行\n第二行");
  });

  test("uses the selected color when adding a note", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    expect(screen.queryByLabelText("Note color")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open more actions, current new note color is yellow" }));
    await user.click(screen.getByRole("button", { name: "Select blue" }));
    await user.click(screen.getByRole("button", { name: "New note" }));
    await user.type(screen.getByLabelText("Edit note"), "蓝色的新便签");
    await user.tab();

    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"blue"');
  });

  test("updates the draft note tone when selecting a color", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "Open more actions, current new note color is yellow" }));
    await user.click(screen.getByRole("button", { name: "Select blue" }));
    await user.click(screen.getByRole("button", { name: "New note" }));

    expect(screen.getByRole("article", { name: /New note/ }).className).toContain("blue");
    expect(screen.queryByText("颜色")).not.toBeInTheDocument();
  });

  test("updates the add button tone when selecting a note color", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const addButton = screen.getByRole("button", { name: "New note" });
    const colorMenuButton = screen.getByRole("button", { name: "Open more actions, current new note color is yellow" });
    expect(addButton.className).toContain("yellow");
    expect(colorMenuButton).toHaveTextContent("...");

    await user.click(colorMenuButton);
    expect(screen.getByLabelText("More actions options")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select pink" }));

    expect(addButton.className).toContain("pink");

    await user.click(screen.getByRole("button", { name: "Open more actions, current new note color is pink" }));
    await user.click(screen.getByRole("button", { name: "Select blue" }));

    expect(addButton.className).toContain("blue");
  });

  test("adds a pink note from the toolbar color picker", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "Open more actions, current new note color is yellow" }));
    await user.click(screen.getByRole("button", { name: "Select pink" }));
    await user.click(screen.getByRole("button", { name: "New note" }));
    await user.type(screen.getByLabelText("Edit note"), "粉色的新便签");
    await user.tab();

    expect(screen.getByRole("article", { name: /My note/ }).className).toContain("pink");
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"pink"');
  });

  test("collapses unselected toolbar colors until the current color is opened", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getByRole("button", { name: "Open more actions, current new note color is yellow" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select blue" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open more actions, current new note color is yellow" }));
    await user.click(screen.getByRole("button", { name: "Select blue" }));

    expect(screen.getByRole("button", { name: "Open more actions, current new note color is blue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select green" })).not.toBeInTheDocument();
  });

  test("opens the toolbar color menu on hover and closes when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const colorMenu = screen.getByLabelText("More actions");
    expect(screen.queryByLabelText("More actions options")).not.toBeInTheDocument();

    await user.hover(colorMenu);
    expect(screen.getByLabelText("More actions options")).toBeInTheDocument();

    await user.unhover(colorMenu);
    await waitFor(() => {
      expect(screen.queryByLabelText("More actions options")).not.toBeInTheDocument();
    });
  });

  test("keeps the toolbar color menu open on click without requiring a second click to dismiss", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const colorMenuButton = screen.getByRole("button", { name: "Open more actions, current new note color is yellow" });
    await user.click(colorMenuButton);
    expect(screen.getByLabelText("More actions options")).toBeInTheDocument();

    await user.click(colorMenuButton);
    expect(screen.getByLabelText("More actions options")).toBeInTheDocument();
  });

  test("keeps a blank new note on blur", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "New note" }));
    expect(screen.getByRole("article", { name: /New note/ })).toBeInTheDocument();

    await user.tab();

    expect(screen.getByRole("article", { name: /New note/ })).toBeInTheDocument();
    expect(screen.getByText("Write a note just for yourself...")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"text":""');
  });

  test("keeps a note after clearing all text", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "原来的内容", tone: "yellow" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    await screen.findByText("原来的内容");
    await user.click(screen.getByRole("button", { name: "Edit note: 原来的内容" }));
    await user.clear(screen.getByLabelText("Edit note"));
    await user.tab();

    expect(screen.getByRole("article", { name: /New note/ })).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"text":""');
  });

  test("edits an existing note by clicking it", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "原来的内容", tone: "yellow" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    await screen.findByText("原来的内容");
    await user.click(screen.getByRole("button", { name: "Edit note: 原来的内容" }));
    await user.clear(screen.getByLabelText("Edit note"));
    await user.type(screen.getByLabelText("Edit note"), "修改后的内容{Enter}");

    expect(screen.getByText("修改后的内容")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("修改后的内容");
  });

  test("loads stored notes from localStorage", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([
        { id: "note-1", text: "刷新后也还在", tone: "green", label: "003", col: 3, row: 2 },
      ]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("刷新后也还在")).toBeInTheDocument();
  });

  test("migrates legacy stored notes without coordinates", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "旧数据", tone: "yellow" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("旧数据")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"col":');
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"row":');
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"label":"001"');
  });

  test("edits a note label with a single click", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "内容", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);

    await screen.findByText("内容");
    await user.click(screen.getByRole("button", { name: "Edit note label: 001" }));
    const labelInput = screen.getByLabelText("Edit note label");
    await user.clear(labelInput);
    await user.type(labelInput, "A1{Enter}");

    expect(screen.getByRole("button", { name: "Edit note label: A1" })).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"label":"A1"');
  });

  test("persists note coordinates after editing", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "New note" }));
    await user.type(screen.getByLabelText("Edit note"), "带坐标的便签");
    await user.tab();

    const stored = window.localStorage.getItem("sticky-notes.local-notes");
    expect(stored).toContain('"col":');
    expect(stored).toContain('"row":');
    expect(stored).toContain("带坐标的便签");
  });

  test("moves a note when dragging the header handle", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "拖我", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const note = (await screen.findByText("拖我")).closest("section");
    expect(note).toBeTruthy();

    const canvas = note?.parentElement;
    expect(canvas).toBeTruthy();

    const canvasRectSpy = vi.spyOn(canvas as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
      right: 1200,
      bottom: 800,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(note as HTMLElement, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(note as HTMLElement, {
      pointerId: 1,
      clientX: 120,
      clientY: 110,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 220,
      clientY: 180,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 220,
      clientY: 180,
      button: 0,
      buttons: 0,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"col":5');
    });
    expect(note?.style.left).toBe("170px");
    canvasRectSpy.mockRestore();
  });

  test("moves a note when dragging empty body space", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "短", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const note = (await screen.findByText("短")).closest("section");
    const noteBody = note?.querySelector(`.${styles.noteBody}`);

    expect(note).toBeTruthy();
    expect(noteBody).toBeTruthy();

    const canvas = note?.parentElement;
    const canvasRectSpy = vi.spyOn(canvas as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
      right: 1200,
      bottom: 800,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(note as HTMLElement, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(noteBody as HTMLElement, {
      pointerId: 1,
      clientX: 130,
      clientY: 160,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 230,
      clientY: 210,
      button: 0,
      buttons: 0,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(window.localStorage.getItem("sticky-notes.local-notes")).not.toContain('"col":2,"row":2');
    });

    canvasRectSpy.mockRestore();
  });

  test("keeps a fixed card size and scrolls long note text inside the body", async () => {
    const longText =
      "这是一条比较长的便利贴内容，用来记录更多细节、想法、待办事项和补充说明，宽度保持不变，超出部分在便签内部滚动。";
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: longText, tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);

    const note = (await screen.findByText(longText)).closest("section");
    const noteBody = note?.querySelector(`.${styles.noteBodyScroll}`);

    expect(note).toHaveStyle({
      width: `${NOTE_COL_SPAN * GRID}px`,
      height: `${NOTE_ROW_SPAN * GRID}px`,
    });
    expect(noteBody).toBeTruthy();
  });

  test("deletes a stored note from the page and localStorage", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "这条可以删掉", tone: "blue" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("这条可以删掉")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete note: 这条可以删掉" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More actions: 这条可以删掉" }));
    await user.click(screen.getByRole("button", { name: "Delete note: 这条可以删掉" }));

    expect(screen.queryByText("这条可以删掉")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).not.toContain("这条可以删掉");
  });

  test("waits before showing the empty state after deleting the last note", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "最后一张先空一会", tone: "yellow" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("最后一张先空一会")).toBeInTheDocument();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "More actions: 最后一张先空一会" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete note: 最后一张先空一会" }));

    expect(screen.queryByText("最后一张先空一会")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start your first note" })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("button", { name: "Start your first note" })).toBeInTheDocument();
  });

  test("shows a trash drop zone in the bottom-right corner", () => {
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getByLabelText("Drag here to delete note")).toBeInTheDocument();
  });

  test("shows an archive drop zone in the bottom-left corner", () => {
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getByLabelText("Open archived notes")).toBeInTheDocument();
  });

  test("matches archive drop zone scale with the trash drop zone", () => {
    expect(cssRuleBody("archiveZone")).toContain("width: 148px;");
    expect(cssRuleBody("archiveZone")).toContain("height: 148px;");
    expect(cssRuleBody("archiveIcon")).toContain("width: 66px;");
    expect(cssRuleBody("archiveIcon")).toContain("height: 66px;");
    expect(LOCAL_NOTES_TSX).toContain("M4.65 5.55");
    expect(LOCAL_NOTES_TSX).toContain("M5.1 10h13.8c.77 0 1.4.63 1.4 1.4");
  });

  test("keeps archive default color aligned with the trash zone without hover", () => {
    expect(cssRuleBody("archiveZone")).toContain("color: #eadfcd;");
    expect(PAGE_CSS).not.toMatch(/\.archiveZoneHasNotes\s*\{[^}]*color:/);
  });

  test("uses a blue folder color for opening archive hover", () => {
    expect(cssRuleBody("archiveZone:hover")).toContain("color: #4f9fe8;");
    expect(cssRuleBody("archiveZone:hover")).not.toContain("#b9a98c");
    expect(PAGE_CSS).not.toContain(".archiveZone:hover .archiveIcon");
    expect(cssRuleBody("archiveZoneHover")).toContain("#4f9fe8");
    expect(cssRuleBody("archiveZoneHover")).not.toContain("#16884b");
    expect(PAGE_CSS).not.toContain(".archiveZoneHover .archiveIcon");
    expect(PAGE_CSS).not.toContain(".trashZoneHover .trashIcon");
  });

  test("keeps archive count out of the folder icon", () => {
    expect(LOCAL_NOTES_TSX).not.toContain("archiveCount");
    expect(PAGE_CSS).not.toContain(".archiveCount");
  });

  test("keeps archived note rows visually close to the original sticky notes", () => {
    expect(cssRuleBody("archiveItem")).toContain("border-left: 4px solid var(--note-accent);");
    expect(cssRuleBody("archiveItem")).toContain("background: color-mix(in oklab, var(--note-accent) 36%, white);");
    expect(cssRuleBody("archiveItemText p")).toContain(
      "font-family: var(--font-kalam), var(--font-geist-sans), system-ui, sans-serif;",
    );
  });

  test("keeps the trash zone below notes and the toolbar", () => {
    const trashZ = cssRuleZIndex("trashZone");
    const noteZ = cssRuleZIndex("note");
    const canvasZ = cssRuleZIndex("canvas");
    const toolbarZ = cssRuleZIndex("noteToolbar");

    expect(trashZ).toBeLessThan(noteZ);
    expect(trashZ).toBeLessThan(canvasZ);
    expect(trashZ).toBeLessThan(toolbarZ);
  });

  test("keeps the clickable archive zone above the canvas but below the toolbar", () => {
    const archiveZ = cssRuleZIndex("archiveZone");
    const noteZ = cssRuleZIndex("note");
    const canvasZ = cssRuleZIndex("canvas");
    const toolbarZ = cssRuleZIndex("noteToolbar");

    expect(archiveZ).toBeGreaterThan(noteZ);
    expect(archiveZ).toBeGreaterThan(canvasZ);
    expect(archiveZ).toBeLessThan(toolbarZ);
  });

  test("hides the trash drop zone on narrow viewports", () => {
    mockViewport(true);
    render(<LocalNotes initialIndex={0} />);

    expect(screen.queryByLabelText("Drag here to delete note")).not.toBeInTheDocument();
  });

  test("archives a note when a card corner enters the archive zone and restores it from the drawer", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "先收起来", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const note = (await screen.findByText("先收起来")).closest("section");
    const archive = screen.getByLabelText("Open archived notes");
    expect(note).toBeTruthy();

    const canvas = note?.parentElement;
    const canvasRectSpy = vi.spyOn(canvas as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
      right: 1200,
      bottom: 800,
      toJSON: () => ({}),
    } as DOMRect);

    const archiveRectSpy = vi.spyOn(archive, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 700,
      left: 0,
      top: 700,
      width: 96,
      height: 96,
      right: 116,
      bottom: 796,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(note as HTMLElement, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(note as HTMLElement, {
      pointerId: 1,
      clientX: 120,
      clientY: 110,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: -70,
      clientY: 586,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: -70,
      clientY: 586,
      button: 0,
      buttons: 0,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(screen.queryByText("先收起来")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"archivedAt":');

    await user.click(screen.getByRole("button", { name: "Open archived notes" }));
    expect(screen.getByRole("dialog", { name: "Archived notes (1)" })).toBeInTheDocument();
    expect(screen.getByText("先收起来")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore note: 先收起来" }));
    expect(await screen.findByRole("article", { name: /先收起来/ })).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).not.toContain('"archivedAt":');

    canvasRectSpy.mockRestore();
    archiveRectSpy.mockRestore();
  });

  test("deletes a note when a card corner enters the trash zone", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "拖进垃圾桶", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const note = (await screen.findByText("拖进垃圾桶")).closest("section");
    const trash = screen.getByLabelText("Drag here to delete note");
    expect(note).toBeTruthy();

    const canvas = note?.parentElement;
    const canvasRectSpy = vi.spyOn(canvas as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
      right: 1200,
      bottom: 800,
      toJSON: () => ({}),
    } as DOMRect);

    const trashRectSpy = vi.spyOn(trash, "getBoundingClientRect").mockReturnValue({
      x: 900,
      y: 700,
      left: 900,
      top: 700,
      width: 80,
      height: 80,
      right: 980,
      bottom: 780,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(note as HTMLElement, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    // Pointer stays outside the trash zone; the note's bottom-right corner enters it.
    fireEvent.pointerDown(note as HTMLElement, {
      pointerId: 1,
      clientX: 120,
      clientY: 110,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 766,
      clientY: 586,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 766,
      clientY: 586,
      button: 0,
      buttons: 0,
      pointerType: "mouse",
    });

    await waitFor(() => {
      expect(screen.queryByText("拖进垃圾桶")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem("sticky-notes.local-notes")).not.toContain("拖进垃圾桶");

    canvasRectSpy.mockRestore();
    trashRectSpy.mockRestore();
  });

  test("does not delete a note via trash drop on narrow viewports", async () => {
    mockViewport(true);
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "手机上别拖删", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const note = (await screen.findByText("手机上别拖删")).closest("section");
    expect(note).toBeTruthy();
    expect(screen.queryByLabelText("Drag here to delete note")).not.toBeInTheDocument();

    const canvas = note?.parentElement;
    const canvasRectSpy = vi.spyOn(canvas as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 390,
      height: 800,
      right: 390,
      bottom: 800,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(note as HTMLElement, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(note as HTMLElement, {
      pointerId: 1,
      clientX: 120,
      clientY: 110,
      button: 0,
      buttons: 1,
      pointerType: "touch",
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 300,
      clientY: 700,
      button: 0,
      buttons: 1,
      pointerType: "touch",
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 300,
      clientY: 700,
      button: 0,
      buttons: 0,
      pointerType: "touch",
    });

    expect(await screen.findByText("手机上别拖删")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("手机上别拖删");

    canvasRectSpy.mockRestore();
  });

  test("changes a stored note color from the note menu", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "可以改颜色", tone: "blue" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("可以改颜色")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More actions: 可以改颜色" }));
    await user.click(screen.getByRole("button", { name: "Change to green: 可以改颜色" }));

    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"green"');
  });
});
