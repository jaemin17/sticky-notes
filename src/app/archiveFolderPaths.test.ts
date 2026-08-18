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

  test("keeps a softly rounded open folder shape as the animation target", () => {
    expect(getArchiveFolderPaths(1)).toEqual({
      top:
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H8.25c-1.22 0 -2.34 .72 -2.92 1.86l-.68 1.4V5.55Z",
      front:
        "M6.95 10.78h13.68c.78 0 1.3 .62 1.13 1.42l-1.25 4.78c-.28 .86 -1.08 2.62 -2.46 2.7L18.05 19.68H5.65c-1.03 0 -1.72 -.78 -1.46 -1.72l1.42 -4.28c.34 -1.02 .72 -2.28 1.34 -2.9Z",
    });
  });

  test("interpolates coordinates between the closed and open folder shapes", () => {
    expect(getArchiveFolderPaths(0.5)).toEqual({
      top:
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H6.45c-.61 0 -1.17 .36 -1.46 .93l-.34 .7V5.55Z",
      front:
        "M6.03 10.39h13.74c.78 0 1.35 .63 1.26 1.41l-.63 5.34c-.14 1.09 -1.08 2.51 -2.43 2.55L17.98 19.69H5.88c-1.18 0 -2.06 -.93 -1.93 -2.06l.71 -5.09c.17 -.9 .68 -1.84 1.37 -2.15Z",
    });
  });
});
