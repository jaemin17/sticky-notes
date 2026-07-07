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
  disabled?: boolean;
  onMove: (noteId: string, col: number, row: number) => void;
};

export function useNoteDrag({ boardRef, disabled = false, onMove }: UseNoteDragOptions) {
  const dragStateRef = useRef<DragState | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ noteId: string; col: number; row: number } | null>(
    null,
  );

  const finishDrag = useCallback(
    (noteId: string, col: number, row: number) => {
      onMove(noteId, col, row);
      dragStateRef.current = null;
      setDraggingNoteId(null);
      setPreviewPosition(null);
    },
    [onMove],
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
    }

    function handlePointerUp(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const board = boardRef.current;
      if (!board) {
        dragStateRef.current = null;
        setDraggingNoteId(null);
        setPreviewPosition(null);
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
  }, [boardRef, finishDrag]);

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
  }

  function getNotePosition(note: LocalNote): { col: number; row: number } {
    if (previewPosition?.noteId === note.id) {
      return { col: previewPosition.col, row: previewPosition.row };
    }

    return { col: note.col, row: note.row };
  }

  return {
    draggingNoteId,
    startDrag,
    getNotePosition,
  };
}
