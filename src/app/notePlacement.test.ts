import { describe, expect, test } from "vitest";
import { computeCanvasSize, findNewNotePlacement, migrationSlot, snapToCol } from "./notePlacement";
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
});
