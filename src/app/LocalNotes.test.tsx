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

    await user.click(screen.getByRole("button", { name: "写一张" }));
    expect(screen.queryByRole("button", { name: "贴上去" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("编辑便签"), "只给自己看的想法");
    await user.tab();

    expect(screen.getByText("只给自己看的想法")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("只给自己看的想法");
  });

  test("shows empty state copy when there are no notes", async () => {
    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("写下一条只给自己看的便签...")).toBeInTheDocument();
  });

  test("hides empty state after adding a note", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await screen.findByText("写下一条只给自己看的便签...");
    await user.click(screen.getByRole("button", { name: "写一张" }));

    expect(screen.queryByText("写下一条只给自己看的便签...")).not.toBeInTheDocument();
  });

  test("creates an editable note when clicking the empty state note", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(await screen.findByRole("button", { name: "开始写第一条便签" }));

    expect(screen.getByLabelText("编辑便签")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "开始写第一条便签" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("编辑便签"), "从空状态写起");
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

    await user.click(screen.getByRole("button", { name: "编辑便签：不能随便选中" }));
    const editor = screen.getByLabelText("编辑便签");
    const allowed = new Event("selectstart", { bubbles: true, cancelable: true });
    editor.dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
  });

  test("shows only one add note button in the toolbar", () => {
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getAllByRole("button", { name: "写一张" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "旧样式写一张对比" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "综合样式写一张对比" })).not.toBeInTheDocument();
  });

  test("keeps organize and clear inside the hover more menu", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const toolbar = screen.getByRole("toolbar", { name: "新建便签工具栏" });
    const moreMenu = screen.getByLabelText("更多操作");

    expect(screen.queryByText("整理")).not.toBeInTheDocument();
    expect(Array.from(toolbar.children)).toEqual([
      screen.getByRole("button", { name: "写一张" }),
      moreMenu,
    ]);

    await user.hover(moreMenu);

    expect(screen.getByLabelText("更多操作选项")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "整理便签" })).toHaveTextContent("整理");
    expect(screen.getByRole("button", { name: "清空所有便签" })).toHaveTextContent("清空");
    expect(screen.getByRole("button", { name: "清空所有便签" }).className).not.toContain("toolbarDangerActionButton");
    expect(cssRuleBody("toolbarActionButton")).toContain("border: 1px solid");
    expect(cssRuleBody("toolbarActionButton")).toContain("color: rgba(17, 18, 23, 0.58);");
    expect(cssRuleBody("toolbarActionMenu")).not.toContain("border-bottom");
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

    await user.hover(screen.getByLabelText("更多操作"));
    await user.click(screen.getByRole("button", { name: "整理便签" }));

    expect(topLeftNote).toHaveStyle({ left: `${1 * GRID}px`, top: `${1 * GRID}px` });
    expect(topRightNote).toHaveStyle({ left: `${8 * GRID}px`, top: `${1 * GRID}px` });
    expect(bottomLeftNote).toHaveStyle({ left: `${1 * GRID}px`, top: `${7 * GRID}px` });

    const stored = window.localStorage.getItem("sticky-notes.local-notes");
    expect(stored).toContain('"label":"A1"');
    expect(stored).toContain('"label":"B-7"');
    expect(stored).toContain('"label":"自定义"');
  });

  test("clears all notes only after confirming from the more menu", async () => {
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

    await user.hover(screen.getByLabelText("更多操作"));
    await user.click(screen.getByRole("button", { name: "清空所有便签" }));

    expect(screen.getByRole("button", { name: "确认清空所有便签" })).toHaveTextContent("确认清空");
    expect(screen.getByText("第一条")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认清空所有便签" }));

    expect(screen.queryByText("第一条")).not.toBeInTheDocument();
    expect(screen.queryByText("第二条")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toBe("[]");
  });

  test("submits a note with Enter", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "回车贴上去{Enter}");

    expect(screen.getByText("回车贴上去")).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain("回车贴上去");
  });

  test("keeps a newline with Shift Enter", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "第一行{Shift>}{Enter}{/Shift}第二行");

    expect(screen.queryByText("第一行")).not.toBeInTheDocument();
    expect(screen.getByLabelText("编辑便签")).toHaveValue("第一行\n第二行");
  });

  test("uses the selected color when adding a note", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    expect(screen.queryByLabelText("便签颜色")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));
    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "蓝色的新便签");
    await user.tab();

    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"blue"');
  });

  test("updates the draft note tone when selecting a color", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));
    await user.click(screen.getByRole("button", { name: "写一张" }));

    expect(screen.getByRole("article", { name: /新便签/ }).className).toContain("blue");
    expect(screen.queryByText("颜色")).not.toBeInTheDocument();
  });

  test("updates the add button tone when selecting a note color", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const addButton = screen.getByRole("button", { name: "写一张" });
    const colorMenuButton = screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" });
    expect(addButton.className).toContain("yellow");
    expect(colorMenuButton).toHaveTextContent("...");

    await user.click(colorMenuButton);
    expect(screen.getByLabelText("更多操作选项")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "选择粉色" }));

    expect(addButton.className).toContain("pink");

    await user.click(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色粉色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));

    expect(addButton.className).toContain("blue");
  });

  test("adds a pink note from the toolbar color picker", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" }));
    await user.click(screen.getByRole("button", { name: "选择粉色" }));
    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "粉色的新便签");
    await user.tab();

    expect(screen.getByRole("article", { name: /我的便签/ }).className).toContain("pink");
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"pink"');
  });

  test("collapses unselected toolbar colors until the current color is opened", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择蓝色" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));

    expect(screen.getByRole("button", { name: "展开更多操作，当前新便签颜色蓝色" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择绿色" })).not.toBeInTheDocument();
  });

  test("opens the toolbar color menu on hover and closes when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const colorMenu = screen.getByLabelText("更多操作");
    expect(screen.queryByLabelText("更多操作选项")).not.toBeInTheDocument();

    await user.hover(colorMenu);
    expect(screen.getByLabelText("更多操作选项")).toBeInTheDocument();

    await user.unhover(colorMenu);
    await waitFor(() => {
      expect(screen.queryByLabelText("更多操作选项")).not.toBeInTheDocument();
    });
  });

  test("keeps the toolbar color menu open on click without requiring a second click to dismiss", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const colorMenuButton = screen.getByRole("button", { name: "展开更多操作，当前新便签颜色黄色" });
    await user.click(colorMenuButton);
    expect(screen.getByLabelText("更多操作选项")).toBeInTheDocument();

    await user.click(colorMenuButton);
    expect(screen.getByLabelText("更多操作选项")).toBeInTheDocument();
  });

  test("keeps a blank new note on blur", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "写一张" }));
    expect(screen.getByRole("article", { name: /新便签/ })).toBeInTheDocument();

    await user.tab();

    expect(screen.getByRole("article", { name: /新便签/ })).toBeInTheDocument();
    expect(screen.getByText("写下一条只给自己看的便签...")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "编辑便签：原来的内容" }));
    await user.clear(screen.getByLabelText("编辑便签"));
    await user.tab();

    expect(screen.getByRole("article", { name: /新便签/ })).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "编辑便签：原来的内容" }));
    await user.clear(screen.getByLabelText("编辑便签"));
    await user.type(screen.getByLabelText("编辑便签"), "修改后的内容{Enter}");

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
    await user.click(screen.getByRole("button", { name: "编辑便签编号：001" }));
    const labelInput = screen.getByLabelText("编辑便签编号");
    await user.clear(labelInput);
    await user.type(labelInput, "A1{Enter}");

    expect(screen.getByRole("button", { name: "编辑便签编号：A1" })).toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"label":"A1"');
  });

  test("persists note coordinates after editing", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "带坐标的便签");
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
    expect(screen.queryByRole("button", { name: "删除便签：这条可以删掉" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作：这条可以删掉" }));
    await user.click(screen.getByRole("button", { name: "删除便签：这条可以删掉" }));

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
    fireEvent.click(screen.getByRole("button", { name: "更多操作：最后一张先空一会" }));
    fireEvent.click(screen.getByRole("button", { name: "删除便签：最后一张先空一会" }));

    expect(screen.queryByText("最后一张先空一会")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "开始写第一条便签" })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByRole("button", { name: "开始写第一条便签" })).toBeInTheDocument();
  });

  test("shows a trash drop zone in the bottom-right corner", () => {
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getByLabelText("拖到此处删除便签")).toBeInTheDocument();
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

  test("hides the trash drop zone on narrow viewports", () => {
    mockViewport(true);
    render(<LocalNotes initialIndex={0} />);

    expect(screen.queryByLabelText("拖到此处删除便签")).not.toBeInTheDocument();
  });

  test("deletes a note when a card corner enters the trash zone", async () => {
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: "拖进垃圾桶", tone: "yellow", label: "001", col: 2, row: 2 }]),
    );

    render(<LocalNotes initialIndex={0} />);
    const note = (await screen.findByText("拖进垃圾桶")).closest("section");
    const trash = screen.getByLabelText("拖到此处删除便签");
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
    expect(screen.queryByLabelText("拖到此处删除便签")).not.toBeInTheDocument();

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
    await user.click(screen.getByRole("button", { name: "更多操作：可以改颜色" }));
    await user.click(screen.getByRole("button", { name: "改为绿色：可以改颜色" }));

    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"green"');
  });
});
