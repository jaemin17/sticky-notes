import { migrationSlot } from "./notePlacement";
import { isNoteTone, STORAGE_KEY, type LocalNote } from "./noteTypes";

type StoredNote = {
  id?: unknown;
  text?: unknown;
  tone?: unknown;
  col?: unknown;
  row?: unknown;
};

function hasValidPosition(note: StoredNote): note is StoredNote & { col: number; row: number } {
  return typeof note.col === "number" && Number.isFinite(note.col) && typeof note.row === "number" && Number.isFinite(note.row);
}

function parseBaseNote(note: StoredNote): Omit<LocalNote, "col" | "row"> | null {
  if (typeof note.id !== "string" || typeof note.text !== "string" || !isNoteTone(note.tone)) {
    return null;
  }

  return {
    id: note.id,
    text: note.text,
    tone: note.tone,
  };
}

export function migrateStoredNotes(rawNotes: unknown[]): LocalNote[] {
  const entries: Array<
    | { kind: "positioned"; note: LocalNote }
    | { kind: "legacy"; note: Omit<LocalNote, "col" | "row"> }
  > = [];

  for (const item of rawNotes) {
    if (typeof item !== "object" || item === null) continue;

    const stored = item as StoredNote;
    const base = parseBaseNote(stored);
    if (!base) continue;

    if (hasValidPosition(stored)) {
      entries.push({
        kind: "positioned",
        note: {
          ...base,
          col: Math.max(0, Math.round(stored.col)),
          row: Math.max(0, Math.round(stored.row)),
        },
      });
      continue;
    }

    entries.push({ kind: "legacy", note: base });
  }

  const result: LocalNote[] = [];
  let legacyIndex = 0;

  for (const entry of entries) {
    if (entry.kind === "positioned") {
      result.push(entry.note);
      continue;
    }

    result.push({
      ...entry.note,
      ...migrationSlot(legacyIndex),
    });
    legacyIndex += 1;
  }

  return result;
}

export function readStoredNotes(): LocalNote[] {
  if (typeof window === "undefined") return [];

  try {
    const rawNotes = window.localStorage.getItem(STORAGE_KEY);
    if (!rawNotes) return [];

    const parsedNotes = JSON.parse(rawNotes);
    if (!Array.isArray(parsedNotes)) return [];

    return migrateStoredNotes(parsedNotes);
  } catch {
    return [];
  }
}

export function writeStoredNotes(notes: LocalNote[]): void {
  const persisted = notes
    .filter((note) => note.text.trim())
    .map(({ id, text, tone, col, row }) => ({ id, text, tone, col, row }));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}
