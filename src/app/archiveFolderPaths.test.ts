import { describe, expect, test } from "vitest";
import { getArchiveFolderPaths } from "./archiveFolderPaths";

describe("archive folder paths", () => {
  test("keeps the closed folder shape as the animation start", () => {
    expect(getArchiveFolderPaths(0)).toEqual({
      top:
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H4.65c0 0 0 0 0 0l0 0V5.55Z",
      front:
        "M5.1 10h13.8c.77 0 1.4 .63 1.4 1.4l0 5.9c0 1.33 -1.07 2.4 -2.4 2.4L17.9 19.7H6.1c-1.33 0 -2.4 -1.07 -2.4 -2.4l0 -5.9c0 -.77 .63 -1.4 1.4 -1.4Z",
    });
  });

  test("keeps the previous open folder shape as the animation target", () => {
    expect(getArchiveFolderPaths(1)).toEqual({
      top:
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H8.25c-1.22 0 -2.34 .72 -2.92 1.86l-.68 1.4V5.55Z",
      front:
        "M7.1 10.8h13.55c.92 0 1.48 .82 1.15 1.66l-1.45 4.58c-.36 1.06 -1.08 2.62 -2.2 2.62L18.15 19.66H5.5c-.96 0 -1.58 -.92 -1.21 -1.82l1.42 -4.18c.4 -1.22 .82 -2.86 1.39 -2.86Z",
    });
  });

  test("interpolates coordinates between the closed and open folder shapes", () => {
    expect(getArchiveFolderPaths(0.5)).toEqual({
      top:
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H6.45c-.61 0 -1.17 .36 -1.46 .93l-.34 .7V5.55Z",
      front:
        "M6.1 10.4h13.68c.84 0 1.44 .72 1.27 1.53l-.72 5.24c-.18 1.2 -1.08 2.51 -2.3 2.51L18.02 19.68H5.8c-1.15 0 -1.99 -1 -1.8 -2.11l.71 -5.04c.2 -.99 .72 -2.13 1.4 -2.13Z",
    });
  });
});
