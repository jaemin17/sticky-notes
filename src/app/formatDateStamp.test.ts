import { describe, expect, test } from "vitest";
import { formatDateStamp } from "./formatDateStamp";

describe("formatDateStamp", () => {
  test("formats the local calendar date for the header stamp", () => {
    const stamp = formatDateStamp(new Date(2026, 6, 17));

    expect(stamp.dateTime).toBe("2026-07-17");
    expect(stamp.label).toBe("Friday, 17 July 2026");
  });

  test("updates the stamp for the next calendar day", () => {
    const stamp = formatDateStamp(new Date(2026, 6, 18));

    expect(stamp.dateTime).toBe("2026-07-18");
    expect(stamp.label).toBe("Saturday, 18 July 2026");
  });
});
