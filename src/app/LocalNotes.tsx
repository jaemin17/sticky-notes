"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import { arrangeNotesByVisualOrder, computeCanvasSize, findNewNotePlacement } from "./notePlacement";
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

const EMPTY_NOTE_REAPPEAR_DELAY_MS = 400;
const NARROW_VIEWPORT_QUERY = "(max-width: 760px)";

function useNarrowViewport() {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isNarrow;
}

export function LocalNotes({ initialIndex }: { initialIndex: number }) {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [emptyStatePhase, setEmptyStatePhase] = useState<"hidden" | "entering" | "visible">("visible");
  const [hasLoadedStoredNotes, setHasLoadedStoredNotes] = useState(false);
  const [editingTextNoteId, setEditingTextNoteId] = useState<string | null>(null);
  const [editingLabelNoteId, setEditingLabelNoteId] = useState<string | null>(null);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);
  const [newNoteTone, setNewNoteTone] = useState<NoteTone>("yellow");
  const [isToolbarColorMenuOpen, setIsToolbarColorMenuOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isArchiveDrawerOpen, setIsArchiveDrawerOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ cols: 16, rows: 12 });
  const [emptyNotePlacement, setEmptyNotePlacement] = useState({ col: 0, row: 0 });
  const editingTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const editingLabelInputRef = useRef<HTMLInputElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const trashRef = useRef<HTMLDivElement | null>(null);
  const archiveRef = useRef<HTMLButtonElement | null>(null);
  const toolbarColorCloseTimeoutRef = useRef<number | null>(null);
  const emptyStateTimerRef = useRef<number | null>(null);
  const isNarrowViewport = useNarrowViewport();
  const canDragDelete = !isNarrowViewport;

  const isEditing = Boolean(editingTextNoteId || editingLabelNoteId);
  const activeNotes = useMemo(() => notes.filter((note) => !note.archivedAt), [notes]);
  const archivedNotes = useMemo(() => notes.filter((note) => note.archivedAt), [notes]);

  function openToolbarColorMenu() {
    if (toolbarColorCloseTimeoutRef.current !== null) {
      window.clearTimeout(toolbarColorCloseTimeoutRef.current);
      toolbarColorCloseTimeoutRef.current = null;
    }
    setIsToolbarColorMenuOpen(true);
  }

  function scheduleCloseToolbarColorMenu() {
    if (toolbarColorCloseTimeoutRef.current !== null) {
      window.clearTimeout(toolbarColorCloseTimeoutRef.current);
    }
    toolbarColorCloseTimeoutRef.current = window.setTimeout(() => {
      setIsToolbarColorMenuOpen(false);
      toolbarColorCloseTimeoutRef.current = null;
    }, 120);
  }

  function closeToolbarColorMenu() {
    if (toolbarColorCloseTimeoutRef.current !== null) {
      window.clearTimeout(toolbarColorCloseTimeoutRef.current);
      toolbarColorCloseTimeoutRef.current = null;
    }
    setIsToolbarColorMenuOpen(false);
  }

  function clearEmptyStateTimer() {
    if (emptyStateTimerRef.current === null) return;
    window.clearTimeout(emptyStateTimerRef.current);
    emptyStateTimerRef.current = null;
  }

  const moveNote = (noteId: string, col: number, row: number) => {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, col, row } : note)),
    );
  };

  function deleteNote(noteId: string) {
    setNotes((currentNotes) => {
      const nextNotes = currentNotes.filter((note) => note.id !== noteId);
      const nextActiveNotes = nextNotes.filter((note) => !note.archivedAt);

      if (currentNotes.filter((note) => !note.archivedAt).length === 1 && nextActiveNotes.length === 0) {
        clearEmptyStateTimer();
        setEmptyStatePhase("hidden");
        emptyStateTimerRef.current = window.setTimeout(() => {
          setEmptyStatePhase("entering");
          emptyStateTimerRef.current = null;
        }, EMPTY_NOTE_REAPPEAR_DELAY_MS);
      }

      return nextNotes;
    });
    setOpenMenuNoteId(null);
    setEditingTextNoteId((currentId) => (currentId === noteId ? null : currentId));
    setEditingLabelNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function archiveNote(noteId: string) {
    clearEmptyStateTimer();
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === noteId ? { ...note, archivedAt: new Date().toISOString() } : note,
      ),
    );
    setEmptyStatePhase("visible");
    setOpenMenuNoteId(null);
    setEditingTextNoteId((currentId) => (currentId === noteId ? null : currentId));
    setEditingLabelNoteId((currentId) => (currentId === noteId ? null : currentId));
  }

  function restoreNote(noteId: string) {
    setNotes((currentNotes) =>
      currentNotes.map((note) => {
        if (note.id !== noteId) return note;
        const restoredNote = { ...note };
        delete restoredNote.archivedAt;
        return restoredNote;
      }),
    );
    setEmptyStatePhase("visible");
  }

  const { draggingNoteId, isOverTrash, isOverArchive, startDrag, getNotePosition } = useNoteDrag({
    boardRef,
    trashRef: canDragDelete ? trashRef : undefined,
    archiveRef,
    disabled: isEditing,
    onMove: moveNote,
    onDelete: canDragDelete ? deleteNote : undefined,
    onArchive: archiveNote,
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
      setCanvasSize(computeCanvasSize(activeNotes, window.innerWidth, window.innerHeight));
      setEmptyNotePlacement(findNewNotePlacement([]));
    }

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [activeNotes]);

  useEffect(() => {
    function preventNoteTextSelection(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (!target.closest(`.${styles.note}`)) return;
      event.preventDefault();
    }

    document.addEventListener("selectstart", preventNoteTextSelection);
    return () => document.removeEventListener("selectstart", preventNoteTextSelection);
  }, []);

  useEffect(() => {
    return () => {
      if (toolbarColorCloseTimeoutRef.current !== null) {
        window.clearTimeout(toolbarColorCloseTimeoutRef.current);
      }
      clearEmptyStateTimer();
    };
  }, []);

  function createBlankNote() {
    clearEmptyStateTimer();
    setEmptyStatePhase("visible");
    const { col, row } = findNewNotePlacement(activeNotes);
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

  function updateNoteTone(noteId: string, tone: NoteTone) {
    setNotes((currentNotes) =>
      currentNotes.map((note) => (note.id === noteId ? { ...note, tone } : note)),
    );
    setOpenMenuNoteId(null);
  }

  function organizeNotes() {
    setNotes((currentNotes) => {
      const arrangedActiveNotes = arrangeNotesByVisualOrder(
        currentNotes.filter((note) => !note.archivedAt),
      );
      const archivedCurrentNotes = currentNotes.filter((note) => note.archivedAt);
      return [...arrangedActiveNotes, ...archivedCurrentNotes];
    });
    setEditingTextNoteId(null);
    setEditingLabelNoteId(null);
    setOpenMenuNoteId(null);
    setIsClearAllDialogOpen(false);
  }

  function clearAllNotes() {
    clearEmptyStateTimer();
    setNotes([]);
    setEmptyStatePhase("visible");
    setEditingTextNoteId(null);
    setEditingLabelNoteId(null);
    setOpenMenuNoteId(null);
    setIsClearAllDialogOpen(false);
    closeToolbarColorMenu();
  }

  function requestClearAllNotes() {
    closeToolbarColorMenu();
    setIsClearAllDialogOpen(true);
  }

  function closeClearAllDialog() {
    setIsClearAllDialogOpen(false);
  }

  function closeArchiveDrawer() {
    setIsArchiveDrawerOpen(false);
  }

  function handleClearAllDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    closeClearAllDialog();
  }

  function handleArchiveDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    closeArchiveDrawer();
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
  const shouldShowEmptyState =
    hasLoadedStoredNotes && activeNotes.length === 0 && emptyStatePhase !== "hidden";
  const archiveTitle = `Archived notes (${archivedNotes.length})`;
  const emptyStateClassName = [
    styles.emptyStateNote,
    styles[newNoteTone],
    emptyStatePhase === "entering" ? styles.emptyStateNoteEntering : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        ref={boardRef}
        className={styles.canvas}
        style={{
          width: canvasSize.cols * GRID,
          height: canvasSize.rows * GRID,
        }}
        aria-label="Sticky notes canvas"
      >
        {shouldShowEmptyState ? (
          <button
            type="button"
            className={emptyStateClassName}
            style={{
              left: emptyNotePlacement.col * GRID,
              top: emptyNotePlacement.row * GRID,
              width: NOTE_COL_SPAN * GRID,
              height: NOTE_ROW_SPAN * GRID,
            }}
            onClick={createBlankNote}
            onAnimationEnd={() => setEmptyStatePhase("visible")}
            aria-label="Start your first note"
          >
            <div className={styles.emptyStateHeader}>
              <span className={styles.emptyStateGrip} aria-hidden="true">
                ⋮⋮
              </span>
              <span className={styles.emptyStateLabel}>001</span>
            </div>
            <p className={styles.emptyStateText}>Write a note just for yourself...</p>
          </button>
        ) : null}
        {activeNotes.map((note, noteIndex) => {
          const noteTitle = note.label.trim() || defaultNoteLabel(noteIndex, initialIndex);
          const noteLabel = note.text.trim() || noteTitle || "New note";
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
              aria-label={`${note.text.trim() ? "My note" : "New note"}: ${noteLabel}, drag empty space to move`}
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
                    aria-label="Edit note label"
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
                    aria-label={`Edit note label: ${noteTitle}`}
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
                    aria-label={`More actions: ${noteLabel}`}
                    aria-expanded={openMenuNoteId === note.id}
                  >
                    ...
                  </button>
                  {openMenuNoteId === note.id ? (
                    <div className={styles.noteActionMenu}>
                      <div className={styles.noteColorMenu} aria-label={`Change color: ${noteLabel}`}>
                        {NOTE_TONES.map((tone) => (
                          <button
                            key={tone}
                            className={`${styles.noteColorButton} ${styles[tone]}`}
                            type="button"
                            onClick={() => updateNoteTone(note.id, tone)}
                            aria-label={`Change to ${TONE_LABELS[tone]}: ${noteLabel}`}
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
                        aria-label={`Delete note: ${noteLabel}`}
                      >
                        Delete
                      </button>
                      <button
                        className={styles.archiveNoteButton}
                        type="button"
                        onClick={() => archiveNote(note.id)}
                        aria-label={`Archive note: ${noteLabel}`}
                      >
                        Archive
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
                      aria-label="Edit note"
                      placeholder="Write a note just for yourself..."
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
                      aria-label={`Edit note: ${note.text.trim() || "Blank note"}`}
                    >
                      <span
                        className={`${styles.noteText} ${note.text.trim() ? "" : styles.noteTextPlaceholder}`}
                      >
                        {note.text.trim() || "Write a note just for yourself..."}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className={styles.noteToolbar} role="toolbar" aria-label="New note toolbar">
        <button
          className={`${styles.addNoteButton} ${styles[newNoteTone]}`}
          type="button"
          onClick={createBlankNote}
          aria-label="New note"
        >
          <span className={styles.addNoteButtonLineIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </span>
          <span>New note</span>
        </button>
        <div
          className={styles.toolbarColorMenu}
          aria-label="More actions"
          onMouseEnter={openToolbarColorMenu}
          onMouseLeave={scheduleCloseToolbarColorMenu}
        >
          <button
            className={styles.toolbarMenuButton}
            type="button"
            onClick={openToolbarColorMenu}
            aria-label={`Open more actions, current new note color is ${TONE_LABELS[newNoteTone]}`}
            aria-expanded={isToolbarColorMenuOpen}
          >
            <span className={styles.toolbarMenuDots}>...</span>
          </button>
          {isToolbarColorMenuOpen ? (
            <div className={styles.toolbarColorPopover} aria-label="More actions options">
              <div className={styles.toolbarActionMenu}>
                <button
                  className={styles.toolbarActionButton}
                  type="button"
                  onClick={organizeNotes}
                  disabled={activeNotes.length <= 1}
                  aria-label="Organize notes"
                >
                  Organize
                </button>
                <button
                  className={styles.toolbarActionButton}
                  type="button"
                  onClick={requestClearAllNotes}
                  disabled={notes.length === 0}
                  aria-label="Clear all notes"
                >
                  Clear
                </button>
              </div>
              <div className={styles.toolbarColorChoices} aria-label="New note color options">
                {toolbarToneOptions.map((tone) => (
                  <button
                    key={tone}
                    className={`${styles.toolbarColorButton} ${styles[tone]}`}
                    type="button"
                    onClick={() => {
                      setNewNoteTone(tone);
                      closeToolbarColorMenu();
                    }}
                    aria-label={`Select ${TONE_LABELS[tone]}`}
                    aria-pressed={newNoteTone === tone}
                  >
                    <span className={styles.noteColorDot} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        ref={archiveRef}
        className={[
          styles.archiveZone,
          draggingNoteId ? styles.archiveZoneActive : "",
          isOverArchive ? styles.archiveZoneHover : "",
          archivedNotes.length > 0 ? styles.archiveZoneHasNotes : "",
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        onClick={() => setIsArchiveDrawerOpen(true)}
        aria-label="Open archived notes"
      >
        <svg
          className={styles.archiveIcon}
          viewBox="0 0 24 24"
          focusable="false"
          aria-hidden="true"
        >
          <path
            className={styles.archiveTopClosed}
            d="M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17.99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H4.65V5.55Z"
          />
          <path
            className={styles.archiveFrontClosed}
            d="M5.1 10h13.8c.77 0 1.4.63 1.4 1.4v5.9c0 1.33-1.07 2.4-2.4 2.4H6.1c-1.33 0-2.4-1.07-2.4-2.4v-5.9c0-.77.63-1.4 1.4-1.4Z"
          />
          <path
            className={styles.archiveTopOpen}
            d="M4.65 5.55c0-.72.58-1.3 1.3-1.3h3.18c.38 0 .74.17.99.45l1.35 1.55h6.58c.72 0 1.3.58 1.3 1.3v1.05H8.1c-1.18 0-2.26.66-2.8 1.7l-.65 1.25v-6Z"
          />
          <path
            className={styles.archiveFrontOpen}
            d="M8.02 9.72h11.76c1.08 0 1.83 1.07 1.47 2.09l-1.55 5.77c-.41 1.19-1.5 2.08-2.76 2.08H5.92c-1.1 0-1.86-1.11-1.46-2.14l1.6-4.92c.46-1.55 1.25-2.88 1.96-2.88Z"
          />
        </svg>
      </button>

      {canDragDelete ? (
        <div
          ref={trashRef}
          className={[
            styles.trashZone,
            draggingNoteId ? styles.trashZoneActive : "",
            isOverTrash ? styles.trashZoneHover : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Drag here to delete note"
        >
          <svg
            className={styles.trashIcon}
            viewBox="0 0 24 24"
            focusable="false"
            aria-hidden="true"
          >
            <g className={styles.trashLid}>
              <path
                fill="currentColor"
                d="M9.7 2.9h4.6c.45 0 .8.35.8.8V4.55H8.9V3.7c0-.45.35-.8.8-.8ZM5.35 4.55h13.3c.55 0 1 .45 1 1v.35c0 .28-.22.5-.5.5H4.85c-.28 0-.5-.22-.5-.5v-.35c0-.55.45-1 1-1Z"
              />
            </g>
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M5.55 7.85 6.55 19.9c.1 1.05.98 1.85 2.04 1.85h6.82c1.06 0 1.94-.8 2.04-1.85L18.45 7.85H5.55Zm3.05 2.35c.38 0 .68.3.68.68v5.8a.68.68 0 0 1-1.36 0v-5.8c0-.38.3-.68.68-.68Zm3.4 0c.38 0 .68.3.68.68v5.8a.68.68 0 0 1-1.36 0v-5.8c0-.38.3-.68.68-.68Zm3.4 0c.38 0 .68.3.68.68v5.8a.68.68 0 0 1-1.36 0v-5.8c0-.38.3-.68.68-.68Z"
            />
          </svg>
        </div>
      ) : null}

      {isArchiveDrawerOpen ? (
        <div
          className={styles.archiveDrawerBackdrop}
          onClick={closeArchiveDrawer}
          onKeyDown={handleArchiveDrawerKeyDown}
        >
          <div
            className={styles.archiveDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.archiveDrawerHeader}>
              <h2 id="archive-drawer-title">{archiveTitle}</h2>
              <button
                className={styles.archiveDrawerCloseButton}
                type="button"
                onClick={closeArchiveDrawer}
                aria-label="Close archived notes"
              >
                x
              </button>
            </div>
            {archivedNotes.length > 0 ? (
              <div className={styles.archiveList}>
                {archivedNotes.map((note) => {
                  const noteLabel = note.text.trim() || note.label || "Blank note";
                  return (
                    <article key={note.id} className={`${styles.archiveItem} ${styles[note.tone]}`}>
                      <div className={styles.archiveItemText}>
                        <span className={styles.archiveItemLabel}>{note.label}</span>
                        <p>{note.text.trim() || "Blank note"}</p>
                      </div>
                      <button
                        className={styles.restoreNoteButton}
                        type="button"
                        onClick={() => restoreNote(note.id)}
                        aria-label={`Restore note: ${noteLabel}`}
                      >
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path
                            d="m15 14 5-5-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.8"
                          />
                          <path
                            d="M19 9h-8.5a5.5 5.5 0 1 0 3.9 9.4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.8"
                          />
                        </svg>
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.archiveEmptyText}>No archived notes.</p>
            )}
          </div>
        </div>
      ) : null}

      {isClearAllDialogOpen ? (
        <div
          className={styles.clearAllDialogBackdrop}
          onClick={closeClearAllDialog}
          onKeyDown={handleClearAllDialogKeyDown}
        >
          <div
            className={styles.clearAllDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-all-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="clear-all-dialog-title">Delete all notes?</h2>
            <p>This will remove every note from this browser.</p>
            <div className={styles.clearAllDialogActions}>
              <button
                className={styles.clearAllDialogCancelButton}
                type="button"
                onClick={closeClearAllDialog}
              >
                Cancel
              </button>
              <button
                className={styles.clearAllDialogDeleteButton}
                type="button"
                onClick={clearAllNotes}
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
