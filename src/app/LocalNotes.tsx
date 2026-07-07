"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { computeCanvasSize, findNewNotePlacement } from "./notePlacement";
import { readStoredNotes, writeStoredNotes } from "./noteStorage";
import {
  defaultNoteLabel,
  GRID,
  NOTE_COL_SPAN,
  NOTE_LABEL_MAX_LENGTH,
  NOTE_ROW_SPAN,
  NOTE_TONES,
  sanitizeNoteLabel,
  TONE_LABELS,
  type LocalNote,
  type NoteTone,
} from "./noteTypes";
import { useNoteDrag } from "./useNoteDrag";

export function LocalNotes({ initialIndex }: { initialIndex: number }) {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [hasLoadedStoredNotes, setHasLoadedStoredNotes] = useState(false);
  const [editingTextNoteId, setEditingTextNoteId] = useState<string | null>(null);
  const [editingLabelNoteId, setEditingLabelNoteId] = useState<string | null>(null);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [newNoteTone, setNewNoteTone] = useState<NoteTone>("yellow");
  const [isToolbarColorMenuOpen, setIsToolbarColorMenuOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ cols: 16, rows: 12 });
  const editingTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const editingLabelInputRef = useRef<HTMLInputElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const isEditing = Boolean(editingTextNoteId || editingLabelNoteId);

  const moveNote = (noteId: string, col: number, row: number) => {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, col, row } : note)),
    );
  };

  const { draggingNoteId, startDrag, getNotePosition } = useNoteDrag({
    boardRef,
    disabled: isEditing,
    onMove: moveNote,
  });

  useEffect(() => {
    queueMicrotask(() => {
      setNotes(readStoredNotes(initialIndex));
      setHasLoadedStoredNotes(true);
    });
  }, [initialIndex]);

  useEffect(() => {
    if (!hasLoadedStoredNotes) return;
    writeStoredNotes(notes);
  }, [hasLoadedStoredNotes, notes]);

  useEffect(() => {
    if (!editingTextNoteId) return;

    queueMicrotask(() => {
      editingTextAreaRef.current?.focus();
    });
  }, [editingTextNoteId]);

  useEffect(() => {
    if (!editingLabelNoteId) return;

    queueMicrotask(() => {
      editingLabelInputRef.current?.focus();
      editingLabelInputRef.current?.select();
    });
  }, [editingLabelNoteId]);

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
      label: defaultNoteLabel(notes.length, initialIndex),
      text: "",
      tone: newNoteTone,
      col,
      row,
    };

    setNotes((currentNotes) => [...currentNotes, nextNote]);
    setEditingTextNoteId(nextNote.id);
    setEditingLabelNoteId(null);
    setOpenMenuNoteId(null);
  }

  function finishEditingText(noteId: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId || note.text.trim()));
    setEditingTextNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function finishEditingLabel(noteId: string, nextLabel: string, fallbackIndex: number) {
    const sanitized = sanitizeNoteLabel(nextLabel);
    const label = sanitized || defaultNoteLabel(fallbackIndex, initialIndex);

    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, label } : note)),
    );
    setEditingLabelNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function handleTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, noteId: string) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    finishEditingText(noteId);
  }

  function handleLabelKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    noteId: string,
    noteIndex: number,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setEditingLabelNoteId(null);
      return;
    }

    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    finishEditingLabel(noteId, event.currentTarget.value, noteIndex);
  }

  function deleteNote(noteId: string) {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId));
    setOpenMenuNoteId(null);
    setEditingTextNoteId((currentId) => (currentId === noteId ? null : currentId));
    setEditingLabelNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function updateNoteTone(noteId: string, tone: NoteTone) {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, tone } : note)),
    );
    setOpenMenuNoteId(null);
  }

  function isInteractiveDragTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button, textarea, input, select, a, [contenteditable='true']"));
  }

  function isNoteBodyScrollable(body: HTMLElement | null) {
    return Boolean(body && body.scrollHeight > body.clientHeight + 1);
  }

  function handleNotePointerDown(event: React.PointerEvent<HTMLElement>, note: LocalNote) {
    if (openMenuNoteId === note.id || isInteractiveDragTarget(event.target)) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    const scrollArea = target?.closest(`.${styles.noteBodyScroll}`);
    if (scrollArea instanceof HTMLElement && isNoteBodyScrollable(scrollArea)) return;

    startDrag(event, note);
  }

  function stopDragPropagation(event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
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
          const noteTitle = note.label.trim() || defaultNoteLabel(noteIndex, initialIndex);
          const noteLabel = note.text.trim() || noteTitle || "新便签";
          const { col, row } = getNotePosition(note);
          const isEditingText = editingTextNoteId === note.id;
          const isEditingLabel = editingLabelNoteId === note.id;
          const isDragging = draggingNoteId === note.id;

          return (
            <section
              key={note.id}
              className={[styles.note, styles[note.tone], isDragging ? styles.noteDragging : ""]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: col * GRID,
                top: row * GRID,
                width: NOTE_COL_SPAN * GRID,
                height: NOTE_ROW_SPAN * GRID,
                zIndex: isDragging ? 100 : undefined,
              }}
              aria-label={`${note.text.trim() ? "我的便签" : "新便签"}：${noteLabel}，拖动空白区域可移动`}
              aria-grabbed={isDragging}
              role="article"
              onPointerDown={(event) => handleNotePointerDown(event, note)}
            >
              <div className={styles.noteHeader}>
                <div className={styles.noteDragGrip} aria-hidden="true">
                  <span className={styles.noteDragGripIcon}>⋮⋮</span>
                </div>

                {isEditingLabel ? (
                  <input
                    ref={editingLabelNoteId === note.id ? editingLabelInputRef : null}
                    className={styles.noteLabelInput}
                    value={note.label}
                    maxLength={NOTE_LABEL_MAX_LENGTH}
                    onPointerDown={stopDragPropagation}
                    onChange={(event) =>
                      setNotes((currentNotes) =>
                        currentNotes.map((currentNote) =>
                          currentNote.id === note.id
                            ? { ...currentNote, label: event.target.value }
                            : currentNote,
                        ),
                      )
                    }
                    onKeyDown={(event) => handleLabelKeyDown(event, note.id, noteIndex)}
                    onBlur={(event) => {
                      if (event.currentTarget.closest("article")?.contains(event.relatedTarget)) return;
                      finishEditingLabel(note.id, event.currentTarget.value, noteIndex);
                    }}
                    aria-label="编辑便签编号"
                  />
                ) : (
                  <button
                    className={styles.noteLabelButton}
                    type="button"
                    onPointerDown={stopDragPropagation}
                    onClick={() => {
                      setEditingLabelNoteId(note.id);
                      setEditingTextNoteId(null);
                      setOpenMenuNoteId(null);
                    }}
                    aria-label={`编辑便签编号：${noteTitle}`}
                  >
                    <span className={styles.noteIndex}>{noteTitle}</span>
                  </button>
                )}

                <div
                  className={styles.noteActions}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerDown={stopDragPropagation}
                >
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
                <div className={styles.noteBodyScroll}>
                  {isEditingText ? (
                    <textarea
                      ref={editingTextNoteId === note.id ? editingTextAreaRef : null}
                      className={styles.composeInput}
                      value={note.text}
                      onPointerDown={stopDragPropagation}
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
                        finishEditingText(note.id);
                      }}
                      aria-label="编辑便签"
                      placeholder="写下一条只给自己看的便签..."
                    />
                  ) : (
                    <button
                      className={styles.noteTextButton}
                      type="button"
                      onPointerDown={stopDragPropagation}
                      onClick={() => {
                        setEditingTextNoteId(note.id);
                        setEditingLabelNoteId(null);
                        setOpenMenuNoteId(null);
                      }}
                      aria-label={`编辑便签：${note.text}`}
                    >
                      <span className={styles.noteText}>{note.text}</span>
                    </button>
                  )}
                </div>
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
