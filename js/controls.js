// Undo and redo controls of the stage toolbar and their keyboard shortcuts,
// plus the freeing of images that neither the project nor its history uses
// any more.

// History action of a key press: 'undo' for Ctrl/Cmd+Z, 'redo' for
// Ctrl/Cmd+Shift+Z and Ctrl+Y, null for any other key or when the focus is in
// a text field (which keeps its own undo).
export function historyShortcut({ key, ctrlKey, metaKey, shiftKey, targetIsText }) {
  if (targetIsText) return null;
  const lower = typeof key === 'string' ? key.toLowerCase() : '';
  if ((ctrlKey || metaKey) && lower === 'z') return shiftKey ? 'redo' : 'undo';
  if (ctrlKey && !shiftKey && lower === 'y') return 'redo';
  return null;
}

// Image ids that were referenced (in `seen`) and no longer are (not in
// `referenced`). An image still decoding or waiting for its layer was never
// seen, so it is never an orphan.
export function orphanIds(seen, referenced) {
  return [...seen].filter((id) => !referenced.has(id));
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

function isTextTarget(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true;
  return element.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(element.type);
}

// Wires btn-undo and btn-redo, the shortcuts on the document and the freeing
// of orphaned images; everything follows the state after each change.
export function mountHistoryControls(ctx) {
  if (!ctx.state) return;
  const undoButton = document.getElementById('btn-undo');
  const redoButton = document.getElementById('btn-redo');
  const seen = new Set();

  const actions = {
    undo: () => ctx.state.undo(),
    redo: () => ctx.state.redo(),
  };

  function sync() {
    undoButton.disabled = !ctx.state.canUndo();
    redoButton.disabled = !ctx.state.canRedo();
    if (!ctx.images) return;
    const referenced = ctx.state.referencedImageIds();
    const orphans = orphanIds(seen, referenced);
    if (orphans.length > 0) ctx.images.drop(orphans);
    for (const id of orphans) seen.delete(id);
    for (const id of referenced) seen.add(id);
  }

  undoButton.addEventListener('click', actions.undo);
  redoButton.addEventListener('click', actions.redo);
  document.addEventListener('keydown', (event) => {
    const action = historyShortcut({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      targetIsText: isTextTarget(event.target),
    });
    if (!action) return;
    event.preventDefault();
    actions[action]();
  });
  ctx.state.subscribe(sync);
  sync();
}
