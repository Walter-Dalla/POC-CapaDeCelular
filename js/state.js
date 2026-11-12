// The only writer of the studio state. State objects are never changed in
// place: every change builds new objects and notifies the subscribers with the
// new and the previous state. Only `project` goes into the undo history.

import * as history from './history.js';

const ORDER_ID_MAX = 40;

function defaultProject() {
  return {
    modelId: 'apple-iphone-15',
    customModel: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
    layers: [],
    background: '#FFFFFF',
  };
}

function defaultExportOptions() {
  return {
    format: 'png',
    dpi: 300,
    bleedOn: true,
    bleedMm: null,
    clip: 'rect',
    cameraHole: false,
    mirror: false,
  };
}

function defaultUi() {
  return {
    tab: 'model',
    selectedLayerId: null,
    cropLayerId: null,
    cropDraft: null,
    showSafeMargin: true,
    guides: { v: false, h: false },
  };
}

function defaultState() {
  return {
    project: defaultProject(),
    exportOptions: defaultExportOptions(),
    orderId: '',
    ui: defaultUi(),
  };
}

function cutOrderId(text) {
  return Array.from(String(text ?? '')).slice(0, ORDER_ID_MAX).join('');
}

function shallowEqual(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => Object.is(a[k], b[k]));
}

// Clears the selection and the crop layer when the layer they name is gone,
// and always drops the crop draft, which belonged to the replaced project.
function cleanUi(ui, project) {
  const ids = new Set(project.layers.map((layer) => layer.id));
  const selectedLayerId = ids.has(ui.selectedLayerId) ? ui.selectedLayerId : null;
  const cropLayerId = ids.has(ui.cropLayerId) ? ui.cropLayerId : null;
  const cropDraft = null;
  if (
    selectedLayerId === ui.selectedLayerId &&
    cropLayerId === ui.cropLayerId &&
    cropDraft === ui.cropDraft
  ) {
    return ui;
  }
  return { ...ui, selectedLayerId, cropLayerId, cropDraft };
}

export function createStore() {
  let state = defaultState();
  let hist = history.createHistory(state.project);
  const listeners = new Set();
  // Changes made by a subscriber while a notification runs wait here, so every
  // subscriber gets every (state, prev) pair once and in the order of the changes.
  const queue = [];
  let notifying = false;

  function set(next) {
    if (next === state) return;
    queue.push([next, state]);
    state = next;
    if (notifying) return;
    notifying = true;
    try {
      while (queue.length > 0) {
        const [current, prev] = queue.shift();
        for (const fn of [...listeners]) fn(current, prev);
      }
    } finally {
      notifying = false;
      queue.length = 0;
    }
  }

  function hasUncommitted() {
    return state.project !== hist.present;
  }

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function updateProject(fn) {
    const project = fn(state.project);
    if (project === state.project) return;
    set({ ...state, project });
  }

  function commit(groupKey = null, now = Date.now()) {
    hist = history.record(hist, state.project, { key: groupKey, now });
  }

  function restore(project) {
    set({ ...state, project, ui: cleanUi(state.ui, project) });
  }

  function undo() {
    if (hasUncommitted()) commit(null);
    if (!history.canUndo(hist)) return false;
    hist = history.undo(hist);
    restore(hist.present);
    return true;
  }

  function redo() {
    if (hasUncommitted()) commit(null);
    if (!history.canRedo(hist)) return false;
    hist = history.redo(hist);
    restore(hist.present);
    return true;
  }

  // An uncommitted change counts as one undo step, since undo commits it first.
  function canUndo() {
    return hasUncommitted() || history.canUndo(hist);
  }

  // An uncommitted change would be committed first and clear the redo steps.
  function canRedo() {
    return !hasUncommitted() && history.canRedo(hist);
  }

  function setExportOptions(patch) {
    const exportOptions = { ...state.exportOptions, ...patch };
    if (shallowEqual(exportOptions, state.exportOptions)) return;
    set({ ...state, exportOptions });
  }

  function setOrderId(text) {
    const orderId = cutOrderId(text);
    if (orderId === state.orderId) return;
    set({ ...state, orderId });
  }

  function setUi(patch) {
    const ui = { ...state.ui, ...patch };
    if (shallowEqual(ui, state.ui)) return;
    set({ ...state, ui });
  }

  function replaceAll(project, exportOptions, orderId) {
    hist = history.createHistory(project);
    set({ ...state, project, exportOptions, orderId, ui: cleanUi(state.ui, project) });
  }

  function resetProject() {
    replaceAll(defaultProject(), defaultExportOptions(), '');
  }

  function loadProject({ project, exportOptions, orderId } = {}) {
    replaceAll(
      { ...defaultProject(), ...project },
      { ...defaultExportOptions(), ...exportOptions },
      cutOrderId(orderId),
    );
  }

  // Image ids used by the live project or by any step of the history.
  function referencedImageIds() {
    const ids = new Set();
    for (const project of [state.project, ...history.snapshots(hist)]) {
      for (const layer of project.layers) ids.add(layer.imageId);
    }
    return ids;
  }

  return {
    getState,
    subscribe,
    updateProject,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    setExportOptions,
    setOrderId,
    setUi,
    resetProject,
    loadProject,
    referencedImageIds,
  };
}

const store = createStore();

export const getState = () => store.getState();
export const subscribe = (fn) => store.subscribe(fn);
export const updateProject = (fn) => store.updateProject(fn);
export const commit = (groupKey, now) => store.commit(groupKey, now);
export const undo = () => store.undo();
export const redo = () => store.redo();
export const canUndo = () => store.canUndo();
export const canRedo = () => store.canRedo();
export const setExportOptions = (patch) => store.setExportOptions(patch);
export const setOrderId = (text) => store.setOrderId(text);
export const setUi = (patch) => store.setUi(patch);
export const resetProject = () => store.resetProject();
export const loadProject = (data) => store.loadProject(data);
export const referencedImageIds = () => store.referencedImageIds();
