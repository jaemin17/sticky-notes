export const GRID = 34;

/** Fixed note width in grid columns (~204px) */
export const NOTE_COL_SPAN = 6;

/** Default note height in grid rows (~170px) */
export const NOTE_ROW_SPAN = 5;

/** Extra grid padding around the outermost notes */
export const CANVAS_PADDING_COLS = 10;
export const CANVAS_PADDING_ROWS = 8;

export type NoteTone = "yellow" | "green" | "blue" | "purple" | "orange" | "pink";

export const NOTE_LABEL_MAX_LENGTH = 12;

export type LocalNote = {
  id: string;
  label: string;
  text: string;
  tone: NoteTone;
  col: number;
  row: number;
};

export function defaultNoteLabel(index: number, initialIndex = 0): string {
  return String(initialIndex + index + 1).padStart(3, "0");
}

export function sanitizeNoteLabel(value: string): string {
  return value.trim().slice(0, NOTE_LABEL_MAX_LENGTH);
}

export const NOTE_TONES: NoteTone[] = ["yellow", "green", "blue", "purple", "orange", "pink"];

export const TONE_LABELS: Record<NoteTone, string> = {
  yellow: "黄色",
  green: "绿色",
  blue: "蓝色",
  purple: "紫色",
  orange: "橙色",
  pink: "粉色",
};

export const STORAGE_KEY = "sticky-notes.local-notes";

export function isNoteTone(value: unknown): value is NoteTone {
  return typeof value === "string" && NOTE_TONES.includes(value as NoteTone);
}
