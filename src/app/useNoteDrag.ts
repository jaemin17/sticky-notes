"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampNotePosition, snapToCol, snapToRow } from "./notePlacement";
import { GRID, type LocalNote } from "./noteTypes";

type DragState = {
  noteId: string;
  pointerId: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

type UseNoteDragOptions = {
  boardRef: React.RefObject<HTMLElement | null>;
  trashRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  onMove: (noteId: string, col: number, row: number) => void;
  onDelete?: (noteId: string) => void;
};

function isPointOverElement(clientX: number, clientY: number, element: HTMLElement | null) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export function useNoteDrag({
  boardRef,
  trashRef,
  disabled = false,
  onMove,
  onDelete,
}: UseNoteDragOptions) {
  const dragStateRef = useRef<DragState | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ noteId: string; col: number; row: number } | null>(
    null,
  );

  const clearDrag = useCallback(() => {
    dragStateRef.current = null;
    setDraggingNoteId(null);
    setPreviewPosition(null);
    setIsOverTrash(false);
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

      setPreviewPosition({ noteId: dragState.noteId, col, row });
      setIsOverTrash(isPointOverElement(event.clientX, event.clientY, trashRef?.current ?? null));
    }

    function handlePointerUp(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const board = boardRef.current;
      if (!board) {
        clearDrag();
        return;
      }

      if (isPointOverElement(event.clientX, event.clientY, trashRef?.current ?? null)) {
        onDelete?.(dragState.noteId);
        clearDrag();
        return;
      }

      const boardRect = board.getBoundingClientRect();
      const left = event.clientX - boardRect.left - dragState.grabOffsetX;
      const top = event.clientY - boardRect.top - dragState.grabOffsetY;
      const { col, row } = clampNotePosition(snapToCol(left), snapToRow(top));
      finishDrag(dragState.noteId, col, row);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [boardRef, clearDrag, finishDrag, onDelete, trashRef]);

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
    setIsOverTrash(isPointOverElement(event.clientX, event.clientY, trashRef?.current ?? null));
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
    startDrag,
    getNotePosition,
  };
}
