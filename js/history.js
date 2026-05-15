// history.js — undo stack

const undoStack = [];
let suppressHistory = false;

function pushUndo(fn) {
  if (suppressHistory) return;
  undoStack.push(fn);
}

function performUndo() {
  if (undoStack.length === 0) {
    setHint("Nothing to undo.");
    return;
  }
  undoStack.pop()();
}

function clearUndoStack() {
  undoStack.length = 0;
}

function withHistorySuppressed(work) {
  const previous = suppressHistory;
  suppressHistory = true;
  try {
    work();
  } finally {
    suppressHistory = previous;
  }
}
