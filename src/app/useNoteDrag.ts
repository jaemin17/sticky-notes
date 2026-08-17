"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampNotePosition, snapToCol, snapToRow } from "./notePlacement";
import { GRID, NOTE_COL_SPAN, NOTE_ROW_SPAN, type LocalNote } from "./noteTypes";

type DragState = {
  noteId: string;
  pointerId: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

type UseNoteDragOptions = {
  boardRef: React.RefObject<HTMLElement | null>;
  trashRef?: React.RefObject<HTMLElement | null>;
  archiveRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  onMove: (noteId: string, col: number, row: number) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
};

function isPointInRect(clientX: number, clientY: number, rect: DOMRect) {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

/** Activate a drop zone when any corner of the note enters it. */
function isNoteCornerInDropZone(
  boardRect: DOMRect,
  noteLeft: number,
  noteTop: number,
  dropZone: HTMLElement | null,
) {
  if (!dropZone) return false;

  const dropZoneRect = dropZone.getBoundingClientRect();
  const width = NOTE_COL_SPAN * GRID;
  const height = NOTE_ROW_SPAN * GRID;
  const left = boardRect.left + noteLeft;
  const top = boardRect.top + noteTop;
  const corners: Array<[number, number]> = [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height],
  ];

  return corners.some(([x, y]) => isPointInRect(x, y, dropZoneRect));
}

export function useNoteDrag({
  boardRef,
  trashRef,
  archiveRef,
  disabled = false,
  onMove,
  onDelete,
  onArchive,
}: UseNoteDragOptions) {
  const dragStateRef = useRef<DragState | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [isOverArchive, setIsOverArchive] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ noteId: string; col: number; row: number } | null>(
    null,
  );

  const clearDrag = useCallback(() => {
    dragStateRef.current = null;
    setDraggingNoteId(null);
    setPreviewPosition(null);
    setIsOverTrash(false);
    setIsOverArchive(false);
  }, []);

  const finishDrag = useCallback(
    (noteId: string, col: number, row: number) => {
      onMove(noteId, col, row);
      clearDrag();
    },
    [clearDrag, onMove],
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current;
      const board = boardRef.current;
      if (!dragState || !board || dragState.pointerId !== event.pointerId) return;

      const boardRect = board.getBoundingClientRect();
      const left = event.clientX - boardRect.left - dragState.grabOffsetX;
      const top = event.clientY - boardRect.top - dragState.grabOffsetY;
      const col = snapToCol(left);
      const row = snapToRow(top);
      const noteLeft = col * GRID;
      const noteTop = row * GRID;

      setPreviewPosition({ noteId: dragState.noteId, col, row });
      setIsOverTrash(
        isNoteCornerInDropZone(boardRect, noteLeft, noteTop, trashRef?.current ?? null),
      );
      setIsOverArchive(
        isNoteCornerInDropZone(boardRect, noteLeft, noteTop, archiveRef?.current ?? null),
      );
    }

    function handlePointerUp(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const board = boardRef.current;
      if (!board) {
        clearDrag();
        return;
      }

      const boardRect = board.getBoundingClientRect();
      const left = event.clientX - boardRect.left - dragState.grabOffsetX;
      const top = event.clientY - boardRect.top - dragState.grabOffsetY;
      const col = snapToCol(left);
      const row = snapToRow(top);
      const noteLeft = col * GRID;
      const noteTop = row * GRID;

      if (isNoteCornerInDropZone(boardRect, noteLeft, noteTop, trashRef?.current ?? null)) {
        onDelete?.(dragState.noteId);
        clearDrag();
        return;
      }

      if (isNoteCornerInDropZone(boardRect, noteLeft, noteTop, archiveRef?.current ?? null)) {
        onArchive?.(dragState.noteId);
        clearDrag();
        return;
      }

      const clamped = clampNotePosition(col, row);
      finishDrag(dragState.noteId, clamped.col, clamped.row);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [archiveRef, boardRef, clearDrag, finishDrag, onArchive, onDelete, trashRef]);

  function startDrag(event: React.PointerEvent<HTMLElement>, note: LocalNote) {
    if (disabled || event.button !== 0) return;

    const board = boardRef.current;
    if (!board) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const boardRect = board.getBoundingClientRect();
    const noteLeft = note.col * GRID;
    const noteTop = note.row * GRID;

    dragStateRef.current = {
      noteId: note.id,
      pointerId: event.pointerId,
      grabOffsetX: event.clientX - boardRect.left - noteLeft,
      grabOffsetY: event.clientY - boardRect.top - noteTop,
    };

    setDraggingNoteId(note.id);
    setPreviewPosition({ noteId: note.id, col: note.col, row: note.row });
    setIsOverTrash(isNoteCornerInDropZone(boardRect, noteLeft, noteTop, trashRef?.current ?? null));
    setIsOverArchive(isNoteCornerInDropZone(boardRect, noteLeft, noteTop, archiveRef?.current ?? null));
  }

  function getNotePosition(note: LocalNote): { col: number; row: number } {
    if (previewPosition?.noteId === note.id) {
      return { col: previewPosition.col, row: previewPosition.row };
    }

    return { col: note.col, row: note.row };
  }

  return {
    draggingNoteId,
    isOverTrash,
    isOverArchive,
    startDrag,
    getNotePosition,
  };
}
