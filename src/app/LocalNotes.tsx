"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
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
  const [text, setText] = useState("");
  const [selectedTone, setSelectedTone] = useState<NoteTone>("yellow");
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setNotes(readStoredNotes());
      setHasLoadedStoredNotes(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredNotes) return;

    window.localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [hasLoadedStoredNotes, notes]);

  function addNote() {
    const trimmedText = text.trim();
    if (!trimmedText) return false;

    const nextNote: LocalNote = {
      id: crypto.randomUUID(),
      text: trimmedText,
      tone: selectedTone,
    };

    setNotes((currentNotes) => [...currentNotes, nextNote]);
    setText("");
    setIsComposeMenuOpen(false);
    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addNote();
  }

  function handleTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    addNote();
  }

  function deleteNote(noteId: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
    setOpenMenuNoteId(null);
  }

  function updateNoteTone(noteId: string, tone: NoteTone) {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, tone } : note)),
    );
    setOpenMenuNoteId(null);
  }

  return (
    <>
      <form className={`${styles.composeNote} ${styles[selectedTone]}`} onSubmit={handleSubmit} aria-label="添加新便签">
        <label className={styles.composeLabel} htmlFor="new-note">
          新便签
        </label>
        <div className={styles.noteActions}>
          <button
            className={styles.noteMenuButton}
            type="button"
            onClick={() => setIsComposeMenuOpen((isOpen) => !isOpen)}
            aria-label="更多操作：新便签"
            aria-expanded={isComposeMenuOpen}
          >
            ...
          </button>
          {isComposeMenuOpen ? (
            <div className={styles.noteActionMenu}>
              <div className={styles.noteColorMenu} aria-label="修改颜色：新便签">
                {noteTones.map((tone) => (
                  <button
                    key={tone}
                    className={`${styles.noteColorButton} ${styles[tone]}`}
                    type="button"
                    onClick={() => {
                      setSelectedTone(tone);
                      setIsComposeMenuOpen(false);
                    }}
                    aria-label={`改为${toneLabels[tone]}：新便签`}
                    aria-pressed={selectedTone === tone}
                  >
                    <span className={styles.noteColorDot} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <textarea
          id="new-note"
          className={styles.composeInput}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleTextKeyDown}
          aria-label="新便签内容"
          placeholder="写下一条只给自己看的便签..."
          rows={5}
        />
        <button className={styles.composeButton} type="submit" disabled={!text.trim()} aria-label="贴上去">
          ↑
        </button>
      </form>

      {notes.map((note, noteIndex) => (
        <section
          key={note.id}
          className={[styles.note, styles[note.tone], noteWidthClassName(note.text)].filter(Boolean).join(" ")}
          aria-label="我的便签"
        >
          <span className={styles.noteIndex}>{String(initialIndex + noteIndex + 1).padStart(3, "0")}</span>
          <span className={styles.noteText}>{note.text}</span>
          <div className={styles.noteActions}>
            <button
              className={styles.noteMenuButton}
              type="button"
              onClick={() => setOpenMenuNoteId((currentId) => (currentId === note.id ? null : note.id))}
              aria-label={`更多操作：${note.text}`}
              aria-expanded={openMenuNoteId === note.id}
            >
              ...
            </button>
            {openMenuNoteId === note.id ? (
              <div className={styles.noteActionMenu}>
                <div className={styles.noteColorMenu} aria-label={`修改颜色：${note.text}`}>
                  {noteTones.map((tone) => (
                    <button
                      key={tone}
                      className={`${styles.noteColorButton} ${styles[tone]}`}
                      type="button"
                      onClick={() => updateNoteTone(note.id, tone)}
                      aria-label={`改为${toneLabels[tone]}：${note.text}`}
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
                  aria-label={`删除便签：${note.text}`}
                >
                  删除
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </>
  );
}
