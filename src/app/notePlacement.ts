import {
  CANVAS_PADDING_COLS,
  CANVAS_PADDING_ROWS,
  GRID,
  NOTE_COL_SPAN,
  NOTE_ROW_SPAN,
  type LocalNote,
} from "./noteTypes";

export function snapToCol(pixels: number): number {
  return Math.max(0, Math.round(pixels / GRID));
}

export function snapToRow(pixels: number): number {
  return Math.max(0, Math.round(pixels / GRID));
}

export function migrationSlot(index: number): { col: number; row: number } {
  const col = (index % 3) * (NOTE_COL_SPAN + 1);
  const row = Math.floor(index / 3) * (NOTE_ROW_SPAN + 1);
  return { col, row };
}

export function computeCanvasSize(
  notes: LocalNote[],
  viewportWidth: number,
  viewportHeight: number,
): { cols: number; rows: number } {
  const minCols = Math.max(Math.ceil(viewportWidth / GRID), 16);
  const minRows = Math.max(Math.ceil((viewportHeight - 120) / GRID), 12);

  let contentMaxCol = 0;
  let contentMaxRow = 0;

  for (const note of notes) {
    contentMaxCol = Math.max(contentMaxCol, note.col + NOTE_COL_SPAN);
    contentMaxRow = Math.max(contentMaxRow, note.row + NOTE_ROW_SPAN);
  }

  return {
    cols: Math.max(minCols, contentMaxCol + CANVAS_PADDING_COLS),
    rows: Math.max(minRows, contentMaxRow + CANVAS_PADDING_ROWS),
  };
}

function overlapsExisting(
  notes: LocalNote[],
  col: number,
  row: number,
  colSpan: number,
): boolean {
  return notes.some((note) => {
    const horizontalOverlap = col < note.col + NOTE_COL_SPAN && col + colSpan > note.col;
    const verticalOverlap = row < note.row + NOTE_ROW_SPAN && row + NOTE_ROW_SPAN > note.row;
    return horizontalOverlap && verticalOverlap;
  });
}

export function findNewNotePlacement(notes: LocalNote[], colSpan = NOTE_COL_SPAN): { col: number; row: number } {
  const centerCol = Math.max(0, snapToCol(window.innerWidth / 2) - Math.floor(colSpan / 2));
  const centerRow = Math.max(
    0,
    snapToRow(window.scrollY + window.innerHeight * 0.38) - Math.floor(NOTE_ROW_SPAN / 2),
  );

  for (let radius = 0; radius <= 24; radius += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      for (let dr = -radius; dr <= radius; dr += 1) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;

        const col = centerCol + dc;
        const row = centerRow + dr;
        if (col < 0 || row < 0) continue;
        if (!overlapsExisting(notes, col, row, colSpan)) {
          return { col, row };
        }
      }
    }
  }

  return { col: centerCol, row: centerRow };
}

export function arrangeNotesByVisualOrder(notes: LocalNote[]): LocalNote[] {
  if (notes.length <= 1) return notes;

  const startCol = Math.min(...notes.map((note) => note.col));
  const startRow = Math.min(...notes.map((note) => note.row));
  const columnCount = Math.ceil(Math.sqrt(notes.length));
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  const nextPositions = new Map<string, { col: number; row: number }>();

  sortedNotes.forEach((note, index) => {
    nextPositions.set(note.id, {
      col: startCol + (index % columnCount) * (NOTE_COL_SPAN + 1),
      row: startRow + Math.floor(index / columnCount) * (NOTE_ROW_SPAN + 1),
    });
  });

  return notes.map((note) => ({
    ...note,
    ...nextPositions.get(note.id),
  }));
}

export function clampNotePosition(col: number, row: number): { col: number; row: number } {
  return {
    col: Math.max(0, col),
    row: Math.max(0, row),
  };
}
