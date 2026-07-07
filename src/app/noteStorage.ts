import { migrationSlot } from "./notePlacement";
import {
  defaultNoteLabel,
  isNoteTone,
  sanitizeNoteLabel,
  STORAGE_KEY,
  type LocalNote,
} from "./noteTypes";

type StoredNote = {
  id?: unknown;
  label?: unknown;
  text?: unknown;
  tone?: unknown;
  col?: unknown;
  row?: unknown;
};

function hasValidPosition(note: StoredNote): note is StoredNote & { col: number; row: number } {
  return typeof note.col === "number" && Number.isFinite(note.col) && typeof note.row === "number" && Number.isFinite(note.row);
}

function parseLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = sanitizeNoteLabel(value);
  return label.length > 0 ? label : null;
}

function parseBaseNote(note: StoredNote): Omit<LocalNote, "col" | "row" | "label"> & { label?: string } | null {
  if (typeof note.id !== "string" || typeof note.text !== "string" || !isNoteTone(note.tone)) {
    return null;
  }

  const label = parseLabel(note.label);

  return {
    id: note.id,
    text: note.text,
    tone: note.tone,
    ...(label ? { label } : {}),
  };
}

export function migrateStoredNotes(rawNotes: unknown[], initialIndex = 0): LocalNote[] {
  const entries: Array<
    | { kind: "positioned"; note: Omit<LocalNote, "label"> & { label?: string } }
    | { kind: "legacy"; note: Omit<LocalNote, "col" | "row" | "label"> & { label?: string } }
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

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];

    if (entry.kind === "positioned") {
      result.push({
        ...entry.note,
        label: entry.note.label ?? defaultNoteLabel(index, initialIndex),
      });
      continue;
    }

    result.push({
      ...entry.note,
      label: entry.note.label ?? defaultNoteLabel(index, initialIndex),
      ...migrationSlot(legacyIndex),
    });
    legacyIndex += 1;
  }

  return result;
}

export function readStoredNotes(initialIndex = 0): LocalNote[] {
  if (typeof window === "undefined") return [];

  try {
    const rawNotes = window.localStorage.getItem(STORAGE_KEY);
    if (!rawNotes) return [];

    const parsedNotes = JSON.parse(rawNotes);
    if (!Array.isArray(parsedNotes)) return [];

    return migrateStoredNotes(parsedNotes, initialIndex);
  } catch {
    return [];
  }
}

export function writeStoredNotes(notes: LocalNote[]): void {
  const persisted = notes
    .filter((note) => note.text.trim())
    .map(({ id, label, text, tone, col, row }) => ({ id, label, text, tone, col, row }));

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}
