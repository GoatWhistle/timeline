export type HistoryStack<T> = {
  undoStack: T[]
  redoStack: T[]
}

export function emptyHistory<T>(): HistoryStack<T> {
  return { undoStack: [], redoStack: [] }
}

export function pushHistory<T>(
  history: HistoryStack<T>,
  snapshot: T,
  limit: number,
): HistoryStack<T> {
  const undoStack = [...history.undoStack, snapshot].slice(-limit)
  return { undoStack, redoStack: [] }
}

export function undoHistory<T>(
  history: HistoryStack<T>,
  current: T,
  limit: number,
): { history: HistoryStack<T>; restored: T } | null {
  if (history.undoStack.length === 0) return null
  const undoStack = history.undoStack.slice(0, -1)
  const restored = history.undoStack[history.undoStack.length - 1] as T
  const redoStack = [...history.redoStack, current].slice(-limit)
  return { history: { undoStack, redoStack }, restored }
}

export function redoHistory<T>(
  history: HistoryStack<T>,
  current: T,
  limit: number,
): { history: HistoryStack<T>; restored: T } | null {
  if (history.redoStack.length === 0) return null
  const redoStack = history.redoStack.slice(0, -1)
  const restored = history.redoStack[history.redoStack.length - 1] as T
  const undoStack = [...history.undoStack, current].slice(-limit)
  return { history: { undoStack, redoStack }, restored }
}
