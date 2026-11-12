// Undo history over opaque snapshots. Every function returns a new history
// object and never changes the one it receives.

const MAX_PAST = 100;
const GROUP_WINDOW_MS = 500;

export function createHistory(initial) {
  return { past: [], present: initial, future: [], lastKey: null, lastAt: 0 };
}

// Records a new snapshot as the present. A record with the same non-null key
// as the previous one, less than 500 ms after it, replaces the present instead
// of adding a step, so a burst of changes becomes one step.
export function record(history, snapshot, { key = null, now = 0 } = {}) {
  if (snapshot === history.present) return history;
  const merge =
    key !== null && key === history.lastKey && now - history.lastAt < GROUP_WINDOW_MS;
  if (merge) {
    return { ...history, present: snapshot, future: [], lastAt: now };
  }
  const past = [...history.past, history.present];
  if (past.length > MAX_PAST) past.splice(0, past.length - MAX_PAST);
  return { past, present: snapshot, future: [], lastKey: key, lastAt: now };
}

export function canUndo(history) {
  return history.past.length > 0;
}

export function canRedo(history) {
  return history.future.length > 0;
}

export function undo(history) {
  if (!canUndo(history)) return history;
  const past = history.past.slice(0, -1);
  const present = history.past[history.past.length - 1];
  const future = [history.present, ...history.future];
  return { past, present, future, lastKey: null, lastAt: 0 };
}

export function redo(history) {
  if (!canRedo(history)) return history;
  const [present, ...future] = history.future;
  const past = [...history.past, history.present];
  return { past, present, future, lastKey: null, lastAt: 0 };
}

// Every snapshot the history holds, oldest first.
export function snapshots(history) {
  return [...history.past, history.present, ...history.future];
}
