import { describe, expect, test } from "vitest";
import {
  arrangeNotesByVisualOrder,
  computeCanvasSize,
  findNewNotePlacement,
  migrationSlot,
  snapToCol,
} from "./notePlacement";
import { GRID, NOTE_COL_SPAN, NOTE_ROW_SPAN, type LocalNote } from "./noteTypes";

describe("notePlacement", () => {
  test("snaps pixel values to grid columns", () => {
    expect(snapToCol(0)).toBe(0);
    expect(snapToCol(17)).toBe(1);
    expect(snapToCol(34)).toBe(1);
  });

  test("assigns deterministic migration slots", () => {
    expect(migrationSlot(0)).toEqual({ col: 0, row: 0 });
    expect(migrationSlot(1)).toEqual({ col: NOTE_COL_SPAN + 1, row: 0 });
    expect(migrationSlot(3)).toEqual({ col: 0, row: NOTE_ROW_SPAN + 1 });
  });

  test("expands canvas to fit notes with padding", () => {
    const notes: LocalNote[] = [
      { id: "1", text: "a", tone: "yellow", col: 10, row: 8 },
    ];

    const size = computeCanvasSize(notes, 800, 600);
    expect(size.cols).toBeGreaterThanOrEqual(10 + NOTE_COL_SPAN);
    expect(size.rows).toBeGreaterThanOrEqual(8 + NOTE_ROW_SPAN);
  });

  test("finds a placement near the viewport center", () => {
    const notes: LocalNote[] = [
      { id: "1", text: "a", tone: "yellow", col: 0, row: 0 },
    ];

    const placement = findNewNotePlacement(notes);
    expect(placement.col).toBeGreaterThanOrEqual(0);
    expect(placement.row).toBeGreaterThanOrEqual(0);
    expect(placement.col * GRID).toBeLessThan(window.innerWidth);
  });

  test("arranges notes into a compact grid by visual order without changing labels", () => {
    const notes: LocalNote[] = [
      { id: "bottom-left", text: "b", tone: "yellow", label: "Custom B", col: 1, row: 16 },
      { id: "top-right", text: "a", tone: "green", label: "A-2", col: 20, row: 2 },
      { id: "top-left", text: "c", tone: "blue", label: "001", col: 3, row: 1 },
    ];

    const arranged = arrangeNotesByVisualOrder(notes);

    expect(arranged.map((note) => note.id)).toEqual(["bottom-left", "top-right", "top-left"]);
    expect(arranged.find((note) => note.id === "top-left")).toMatchObject({
      label: "001",
      col: 1,
      row: 1,
    });
    expect(arranged.find((note) => note.id === "top-right")).toMatchObject({
      label: "A-2",
      col: 8,
      row: 1,
    });
    expect(arranged.find((note) => note.id === "bottom-left")).toMatchObject({
      label: "Custom B",
      col: 1,
      row: 7,
    });
  });
});
