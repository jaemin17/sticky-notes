"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { computeCanvasSize, findNewNotePlacement } from "./notePlacement";
import { readStoredNotes, writeStoredNotes } from "./noteStorage";
import {
  getNoteColSpan,
  GRID,
  isWideNote,
  NOTE_TONES,
  TONE_LABELS,
  type LocalNote,
  type NoteTone,
} from "./noteTypes";
import { useNoteDrag } from "./useNoteDrag";

export function LocalNotes({ initialIndex }: { initialIndex: number }) {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [hasLoadedStoredNotes, setHasLoadedStoredNotes] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [newNoteTone, setNewNoteTone] = useState<NoteTone>("yellow");
  const [isToolbarColorMenuOpen, setIsToolbarColorMenuOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ cols: 16, rows: 12 });
  const editingTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const moveNote = (noteId: string, col: number, row: number) => {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, col, row } : note)),
    );
  };

  const { draggingNoteId, startDrag, getNotePosition } = useNoteDrag({
    boardRef,
    disabled: Boolean(editingNoteId),
    onMove: moveNote,
  });

  useEffect(() => {
    queueMicrotask(() => {
      setNotes(readStoredNotes());
      setHasLoadedStoredNotes(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredNotes) return;
    writeStoredNotes(notes);
  }, [hasLoadedStoredNotes, notes]);

  useEffect(() => {
    if (!editingNoteId) return;

    queueMicrotask(() => {
      editingTextAreaRef.current?.focus();
    });
  }, [editingNoteId]);

  useEffect(() => {
    function updateCanvasSize() {
      setCanvasSize(computeCanvasSize(notes, window.innerWidth, window.innerHeight));
    }

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [notes]);

  function createBlankNote() {
    const { col, row } = findNewNotePlacement(notes);
    const nextNote: LocalNote = {
      id: crypto.randomUUID(),
      text: "",
      tone: newNoteTone,
      col,
      row,
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

  const toolbarToneOptions = NOTE_TONES.filter((tone) => tone !== newNoteTone);

  return (
    <>
      <div
        ref={boardRef}
        className={styles.canvas}
        style={{
          width: canvasSize.cols * GRID,
          height: canvasSize.rows * GRID,
        }}
        aria-label="便签画布"
      >
        {notes.map((note, noteIndex) => {
          const noteLabel = note.text.trim() || "新便签";
          const { col, row } = getNotePosition(note);
          const isEditing = editingNoteId === note.id;
          const isDragging = draggingNoteId === note.id;

          return (
            <section
              key={note.id}
              className={[
                styles.note,
                styles[note.tone],
                isWideNote(note) ? styles.noteWide : "",
                isDragging ? styles.noteDragging : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: col * GRID,
                top: row * GRID,
                width: getNoteColSpan(note) * GRID,
                zIndex: isDragging ? 100 : undefined,
              }}
              aria-label={note.text.trim() ? "我的便签" : "新便签"}
              role="article"
            >
              <div className={styles.noteHeader}>
                <div
                  className={styles.noteDragHandle}
                  onPointerDown={(event) => startDrag(event, note)}
                  aria-label={`拖动便签：${noteLabel}`}
                  aria-grabbed={isDragging}
                >
                  <span className={styles.noteIndex}>{String(initialIndex + noteIndex + 1).padStart(3, "0")}</span>
                </div>
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
                        {NOTE_TONES.map((tone) => (
                          <button
                            key={tone}
                            className={`${styles.noteColorButton} ${styles[tone]}`}
                            type="button"
                            onClick={() => updateNoteTone(note.id, tone)}
                            aria-label={`改为${TONE_LABELS[tone]}：${noteLabel}`}
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
              </div>

              <div className={styles.noteBody}>
                {isEditing ? (
                  <textarea
                    ref={editingNoteId === note.id ? editingTextAreaRef : null}
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
              </div>
            </section>
          );
        })}
      </div>

      <div className={styles.noteToolbar} role="toolbar" aria-label="新建便签工具栏">
        <button
          className={`${styles.addNoteButton} ${styles[newNoteTone]}`}
          type="button"
          onClick={createBlankNote}
          aria-label="写一张"
        >
          <span className={styles.addNoteButtonLineIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </span>
          <span>写一张</span>
        </button>
        <div className={styles.toolbarColorMenu} aria-label="选择新便签颜色">
          <button
            className={styles.toolbarMenuButton}
            type="button"
            onClick={() => setIsToolbarColorMenuOpen((isOpen) => !isOpen)}
            aria-label={`展开新便签颜色，当前${TONE_LABELS[newNoteTone]}`}
            aria-expanded={isToolbarColorMenuOpen}
          >
            <span className={styles.toolbarMenuDots}>...</span>
          </button>
          {isToolbarColorMenuOpen ? (
            <div className={styles.toolbarColorPopover} aria-label="新便签颜色选项">
              {toolbarToneOptions.map((tone) => (
                <button
                  key={tone}
                  className={`${styles.toolbarColorButton} ${styles[tone]}`}
                  type="button"
                  onClick={() => {
                    setNewNoteTone(tone);
                    setIsToolbarColorMenuOpen(false);
                  }}
                  aria-label={`选择${TONE_LABELS[tone]}`}
                  aria-pressed={newNoteTone === tone}
                >
                  <span className={styles.noteColorDot} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
