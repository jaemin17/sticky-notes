import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { LocalNotes } from "./LocalNotes";

describe("LocalNotes", () => {
  beforeEach(() => {
    window.localStorage.clear();
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

  test("shows only one add note button in the toolbar", () => {
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getAllByRole("button", { name: "写一张" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "旧样式写一张对比" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "综合样式写一张对比" })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "展开新便签颜色，当前黄色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));
    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "蓝色的新便签");
    await user.tab();

    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"blue"');
  });

  test("updates the draft note tone when selecting a color", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "展开新便签颜色，当前黄色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));
    await user.click(screen.getByRole("button", { name: "写一张" }));

    expect(screen.getByRole("article", { name: "新便签" }).className).toContain("blue");
    expect(screen.queryByText("颜色")).not.toBeInTheDocument();
  });

  test("updates the add button tone when selecting a note color", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    const addButton = screen.getByRole("button", { name: "写一张" });
    const colorMenuButton = screen.getByRole("button", { name: "展开新便签颜色，当前黄色" });
    expect(addButton.className).toContain("yellow");
    expect(colorMenuButton).toHaveTextContent("...");

    await user.click(colorMenuButton);
    expect(screen.getByLabelText("新便签颜色选项")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "选择粉色" }));

    expect(addButton.className).toContain("pink");

    await user.click(screen.getByRole("button", { name: "展开新便签颜色，当前粉色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));

    expect(addButton.className).toContain("blue");
  });

  test("adds a pink note from the toolbar color picker", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "展开新便签颜色，当前黄色" }));
    await user.click(screen.getByRole("button", { name: "选择粉色" }));
    await user.click(screen.getByRole("button", { name: "写一张" }));
    await user.type(screen.getByLabelText("编辑便签"), "粉色的新便签");
    await user.tab();

    expect(screen.getByRole("article", { name: "我的便签" }).className).toContain("pink");
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toContain('"tone":"pink"');
  });

  test("collapses unselected toolbar colors until the current color is opened", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    expect(screen.getByRole("button", { name: "展开新便签颜色，当前黄色" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择蓝色" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开新便签颜色，当前黄色" }));
    await user.click(screen.getByRole("button", { name: "选择蓝色" }));

    expect(screen.getByRole("button", { name: "展开新便签颜色，当前蓝色" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择绿色" })).not.toBeInTheDocument();
  });

  test("removes a blank new note on blur", async () => {
    const user = userEvent.setup();
    render(<LocalNotes initialIndex={0} />);

    await user.click(screen.getByRole("button", { name: "写一张" }));
    expect(screen.getByRole("article", { name: "新便签" })).toBeInTheDocument();

    await user.tab();

    expect(screen.queryByRole("article", { name: "新便签" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("sticky-notes.local-notes")).toBe("[]");
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
      JSON.stringify([{ id: "note-1", text: "刷新后也还在", tone: "green" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect(await screen.findByText("刷新后也还在")).toBeInTheDocument();
  });

  test("uses a wider card for long note text", async () => {
    const longText =
      "这是一条比较长的便利贴内容，用来记录更多细节、想法、待办事项和补充说明，所以它应该比普通短便签更宽一点。";
    window.localStorage.setItem(
      "sticky-notes.local-notes",
      JSON.stringify([{ id: "note-1", text: longText, tone: "yellow" }]),
    );

    render(<LocalNotes initialIndex={0} />);

    expect((await screen.findByText(longText)).closest("section")?.className).toContain("noteWide");
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
