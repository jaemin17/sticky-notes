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
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H7.95c-1.02 0 -2.02 .58 -2.58 1.58l-.5 1.22V5.55Z",
      front:
        "M6.86 10.84h13.58c.82 0 1.42 .62 1.25 1.42l-1.15 4.58c-.24 1.02 -1.12 2.54 -2.38 2.62L18.16 19.46H5.72c-1.1 0 -1.82 -.8 -1.56 -1.78l1.15 -4.58c.2 -.9 .82 -1.76 1.5 -2.16Z",
    });
  });

  test("interpolates coordinates between the closed and open folder shapes", () => {
    expect(getArchiveFolderPaths(0.5)).toEqual({
      top:
        "M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17 .99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H6.3c-.51 0 -1.01 .29 -1.29 .79l-.25 .61V5.55Z",
      front:
        "M5.98 10.42h13.69c.79 0 1.41 .63 1.32 1.41l-.57 5.24c-.12 1.18 -1.1 2.47 -2.39 2.51L18.03 19.58H5.91c-1.22 0 -2.11 -.94 -1.98 -2.09l.57 -5.24c.1 -.83 .72 -1.58 1.45 -1.78Z",
    });
  });
});
