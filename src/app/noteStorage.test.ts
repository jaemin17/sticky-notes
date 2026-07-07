import { describe, expect, test } from "vitest";
import { migrateStoredNotes } from "./noteStorage";

describe("noteStorage", () => {
  test("migrates legacy notes without coordinates", () => {
    const migrated = migrateStoredNotes([
      { id: "note-1", text: "第一条", tone: "yellow" },
      { id: "note-2", text: "第二条", tone: "green" },
    ]);

    expect(migrated).toHaveLength(2);
    expect(migrated[0]).toMatchObject({ col: 0, row: 0 });
    expect(migrated[1]).toMatchObject({ col: 7, row: 0 });
  });

  test("keeps existing coordinates when present", () => {
    const migrated = migrateStoredNotes([
      { id: "note-1", text: "固定位置", tone: "blue", col: 12, row: 4 },
    ]);

    expect(migrated[0]).toMatchObject({ col: 12, row: 4 });
  });
});
