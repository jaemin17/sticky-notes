"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type NoteTone = "yellow" | "green" | "blue" | "purple" | "orange";

type LocalNote = {
  id: string;
  text: string;
  tone: NoteTone;
};

const storageKey = "sticky-notes.local-notes";
const noteTones: NoteTone[] = ["yellow", "green", "blue", "purple", "orange"];
const toneLabels: Record<NoteTone, string> = {
  yellow: "黄色",
  green: "绿色",
  blue: "蓝色",
  purple: "紫色",
  orange: "橙色",
};

function noteWidthClassName(text: string) {
  if (text.length >= 40) return styles.noteWide;
  return "";
}

function readStoredNotes(): LocalNote[] {
  if (typeof window === "undefined") return [];

  try {
    const rawNotes = window.localStorage.getItem(storageKey);
    if (!rawNotes) return [];

    const parsedNotes = JSON.parse(rawNotes);
    if (!Array.isArray(parsedNotes)) return [];

    return parsedNotes.filter((note): note is LocalNote => {
      return (
        typeof note === "object" &&
        note !== null &&
        typeof note.id === "string" &&
        typeof note.text === "string" &&
        noteTones.includes(note.tone)
      );
    });
  } catch {
    return [];
  }
}

export function LocalNotes({ initialIndex }: { initialIndex: number }) {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [hasLoadedStoredNotes, setHasLoadedStoredNotes] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [newNoteTone, setNewNoteTone] = useState<NoteTone>("yellow");
  const editingTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setNotes(readStoredNotes());
      setHasLoadedStoredNotes(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredNotes) return;

    window.localStorage.setItem(storageKey, JSON.stringify(notes.filter((note) => note.text.trim())));
  }, [hasLoadedStoredNotes, notes]);

  useEffect(() => {
    if (!editingNoteId) return;

    queueMicrotask(() => {
      editingTextAreaRef.current?.focus();
    });
  }, [editingNoteId]);

  function createBlankNote() {
    const nextNote: LocalNote = {
      id: crypto.randomUUID(),
      text: "",
      tone: newNoteTone,
    };

    setNotes((currentNotes) => [...currentNotes, nextNote]);
    setEditingNoteId(nextNote.id);
    setOpenMenuNoteId(null);
  }

  function finishEditing(noteId: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId || note.text.trim()));
    setEditingNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function handleTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, noteId: string) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    finishEditing(noteId);
  }

  function deleteNote(noteId: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
    setOpenMenuNoteId(null);
    setEditingNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function updateNoteTone(noteId: string, tone: NoteTone) {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, tone } : note)),
    );
    setOpenMenuNoteId(null);
  }

  return (
    <>
      {notes.map((note, noteIndex) => {
        const noteLabel = note.text.trim() || "新便签";

        return (
          <section
              key={note.id}
              className={[styles.note, styles[note.tone], noteWidthClassName(note.text)].filter(Boolean).join(" ")}
              aria-label={note.text.trim() ? "我的便签" : "新便签"}
              role="article"
            >
              <span className={styles.noteIndex}>{String(initialIndex + noteIndex + 1).padStart(3, "0")}</span>
              {editingNoteId === note.id ? (
                <textarea
                  ref={editingTextAreaRef}
                  className={styles.composeInput}
                  value={note.text}
                  onChange={(event) =>
                    setNotes((currentNotes) =>
                      currentNotes.map((currentNote) =>
                        currentNote.id === note.id ? { ...currentNote, text: event.target.value } : currentNote,
                      ),
                    )
                  }
                  onKeyDown={(event) => handleTextKeyDown(event, note.id)}
                  onBlur={(event) => {
                    if (event.currentTarget.closest("article")?.contains(event.relatedTarget)) return;
                    finishEditing(note.id);
                  }}
                  aria-label="编辑便签"
                  placeholder="写下一条只给自己看的便签..."
                  rows={5}
                />
              ) : (
                <button
                  className={styles.noteTextButton}
                  type="button"
                  onClick={() => {
                    setEditingNoteId(note.id);
                    setOpenMenuNoteId(null);
                  }}
                  aria-label={`编辑便签：${note.text}`}
                >
                  <span className={styles.noteText}>{note.text}</span>
                </button>
              )}
              <div className={styles.noteActions} onMouseDown={(event) => event.preventDefault()}>
                <button
                  className={styles.noteMenuButton}
                  type="button"
                  onClick={() => setOpenMenuNoteId((currentId) => (currentId === note.id ? null : note.id))}
                  aria-label={`更多操作：${noteLabel}`}
                  aria-expanded={openMenuNoteId === note.id}
                >
                  ...
                </button>
                {openMenuNoteId === note.id ? (
                  <div className={styles.noteActionMenu}>
                    <div className={styles.noteColorMenu} aria-label={`修改颜色：${noteLabel}`}>
                      {noteTones.map((tone) => (
                        <button
                          key={tone}
                          className={`${styles.noteColorButton} ${styles[tone]}`}
                          type="button"
                          onClick={() => updateNoteTone(note.id, tone)}
                          aria-label={`改为${toneLabels[tone]}：${noteLabel}`}
                          aria-pressed={note.tone === tone}
                        >
                          <span className={styles.noteColorDot} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    <button
                      className={styles.deleteNoteButton}
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      aria-label={`删除便签：${noteLabel}`}
                    >
                      删除
                    </button>
                  </div>
                ) : null}
              </div>
          </section>
        );
      })}
      <div className={styles.noteToolbar} role="toolbar" aria-label="新建便签工具栏">
        <div className={styles.toolbarColorMenu} aria-label="选择新便签颜色">
          {noteTones.map((tone) => (
            <button
              key={tone}
              className={`${styles.toolbarColorButton} ${styles[tone]}`}
              type="button"
              onClick={() => setNewNoteTone(tone)}
              aria-label={`选择${toneLabels[tone]}`}
              aria-pressed={newNoteTone === tone}
            >
              <span className={styles.noteColorDot} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button className={styles.addNoteButton} type="button" onClick={createBlankNote}>
          写一张
        </button>
      </div>
    </>
  );
}
