import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as defaultStore from '../js/state.js';
import { createStore } from '../js/state.js';

const DEFAULTS = {
  project: {
    modelId: 'apple-iphone-15',
    customModel: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
    layers: [],
    background: '#FFFFFF',
  },
  exportOptions: {
    format: 'png',
    dpi: 300,
    bleedOn: true,
    bleedMm: null,
    clip: 'rect',
    cameraHole: false,
    mirror: false,
  },
  orderId: '',
  ui: {
    tab: 'model',
    selectedLayerId: null,
    cropLayerId: null,
    cropDraft: null,
    showSafeMargin: true,
    guides: { v: false, h: false },
  },
};

function makeLayer(id, imageId) {
  return {
    id,
    name: id,
    imageId,
    naturalWidth: 400,
    naturalHeight: 800,
    cx: 0,
    cy: 0,
    width: 40,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}

function addLayer(store, layer) {
  store.updateProject((p) => ({ ...p, layers: [...p.layers, layer] }));
}

function moveLayer(store, id, cx) {
  store.updateProject((p) => ({
    ...p,
    layers: p.layers.map((l) => (l.id === id ? { ...l, cx } : l)),
  }));
}

test('defaults equal the documented shape', () => {
  const store = createStore();
  assert.deepEqual(store.getState(), DEFAULTS);
  assert.equal(store.canUndo(), false);
  assert.equal(store.canRedo(), false);
});

test('the default store delegates to one store', () => {
  assert.deepEqual(defaultStore.getState(), DEFAULTS);
  defaultStore.setOrderId('abc');
  assert.equal(defaultStore.getState().orderId, 'abc');
  defaultStore.resetProject();
  assert.equal(defaultStore.getState().orderId, '');
});

test('two updateProject and one commit make one undo step', () => {
  const store = createStore();
  const initial = store.getState().project;
  store.updateProject((p) => ({ ...p, background: '#000000' }));
  store.updateProject((p) => ({ ...p, modelId: 'custom' }));
  store.commit(null, 1000);
  assert.equal(store.canUndo(), true);
  assert.equal(store.undo(), true);
  assert.equal(store.getState().project, initial);
  assert.equal(store.canUndo(), false);
  assert.equal(store.canRedo(), true);
  assert.equal(store.redo(), true);
  assert.equal(store.getState().project.background, '#000000');
  assert.equal(store.getState().project.modelId, 'custom');
});

test('updateProject never changes the previous project', () => {
  const store = createStore();
  const before = store.getState();
  store.updateProject((p) => ({ ...p, background: '#000000' }));
  assert.equal(before.project.background, '#FFFFFF');
  assert.notEqual(store.getState(), before);
});

test('commit with the same group key within 500 ms merges', () => {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  moveLayer(store, 'l1', 5);
  store.commit('drag', 2000);
  moveLayer(store, 'l1', 10);
  store.commit('drag', 2300);
  store.undo();
  assert.equal(store.getState().project.layers[0].cx, 0);
  store.undo();
  assert.deepEqual(store.getState().project.layers, []);
});

test('undo restores the project and keeps exportOptions and orderId', () => {
  const store = createStore();
  store.updateProject((p) => ({ ...p, background: '#000000' }));
  store.commit(null, 1000);
  store.setExportOptions({ dpi: 600, mirror: true });
  store.setOrderId('PED-1');
  store.undo();
  assert.equal(store.getState().project.background, '#FFFFFF');
  assert.equal(store.getState().exportOptions.dpi, 600);
  assert.equal(store.getState().exportOptions.mirror, true);
  assert.equal(store.getState().orderId, 'PED-1');
});

test('undo commits an uncommitted change first', () => {
  const store = createStore();
  store.updateProject((p) => ({ ...p, background: '#000000' }));
  store.commit(null, 1000);
  store.updateProject((p) => ({ ...p, background: '#FF0000' }));
  assert.equal(store.canUndo(), true);
  store.undo();
  assert.equal(store.getState().project.background, '#000000');
  store.redo();
  assert.equal(store.getState().project.background, '#FF0000');
});

test('selection and crop cleared when their layer disappears on undo', () => {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  store.setUi({ selectedLayerId: 'l1', cropLayerId: 'l1', cropDraft: { x: 0, y: 0, width: 0.5, height: 0.5 } });
  store.undo();
  const ui = store.getState().ui;
  assert.equal(ui.selectedLayerId, null);
  assert.equal(ui.cropLayerId, null);
  assert.equal(ui.cropDraft, null);
});

test('selection kept when its layer still exists after undo', () => {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  moveLayer(store, 'l1', 7);
  store.commit(null, 2000);
  store.setUi({ selectedLayerId: 'l1' });
  store.undo();
  assert.equal(store.getState().ui.selectedLayerId, 'l1');
  assert.equal(store.getState().project.layers[0].cx, 0);
});

const DRAFT = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };

// Store with layer l1 committed, then moved and committed again, in crop mode
// on l1 with a draft.
function cropStore() {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  moveLayer(store, 'l1', 7);
  store.commit(null, 2000);
  store.setUi({ selectedLayerId: 'l1', cropLayerId: 'l1', cropDraft: DRAFT });
  return store;
}

function assertDraftDropped(store) {
  const ui = store.getState().ui;
  assert.equal(ui.selectedLayerId, 'l1');
  assert.equal(ui.cropLayerId, 'l1');
  assert.equal(ui.cropDraft, null);
}

test('undo drops the crop draft even when its layer still exists', () => {
  const store = cropStore();
  store.undo();
  assertDraftDropped(store);
});

test('redo drops the crop draft even when its layer still exists', () => {
  const store = cropStore();
  store.undo();
  store.setUi({ cropDraft: DRAFT });
  store.redo();
  assertDraftDropped(store);
});

test('loadProject drops the crop draft even when its layer still exists', () => {
  const store = cropStore();
  store.loadProject({ project: { layers: [makeLayer('l1', 'img1')] } });
  assertDraftDropped(store);
});

test('resetProject drops the crop draft', () => {
  const store = cropStore();
  store.resetProject();
  const ui = store.getState().ui;
  assert.equal(ui.cropLayerId, null);
  assert.equal(ui.cropDraft, null);
});

test('referencedImageIds includes an image present only in a past step', () => {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  store.updateProject((p) => ({ ...p, layers: [] }));
  store.commit(null, 2000);
  addLayer(store, makeLayer('l2', 'img2'));
  assert.deepEqual([...store.referencedImageIds()].sort(), ['img1', 'img2']);
});

test('referencedImageIds includes an image only in a redo step', () => {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  store.undo();
  assert.deepEqual([...store.referencedImageIds()], ['img1']);
});

test('resetProject restores defaults and empties history', () => {
  const store = createStore();
  addLayer(store, makeLayer('l1', 'img1'));
  store.commit(null, 1000);
  store.setUi({ selectedLayerId: 'l1', tab: 'images' });
  store.setExportOptions({ dpi: 150 });
  store.setOrderId('X');
  store.resetProject();
  const s = store.getState();
  assert.deepEqual(s.project, DEFAULTS.project);
  assert.deepEqual(s.exportOptions, DEFAULTS.exportOptions);
  assert.equal(s.orderId, '');
  assert.equal(s.ui.selectedLayerId, null);
  assert.equal(store.canUndo(), false);
  assert.equal(store.canRedo(), false);
  assert.deepEqual([...store.referencedImageIds()], []);
});

test('loadProject replaces everything and empties history', () => {
  const store = createStore();
  store.updateProject((p) => ({ ...p, background: '#000000' }));
  store.commit(null, 1000);
  const project = {
    modelId: 'custom',
    customModel: { width: 70, height: 140, cornerRadius: 10, bleed: 3 },
    layers: [makeLayer('l9', 'img9')],
    background: '#123456',
  };
  store.loadProject({ project, exportOptions: { format: 'pdf', dpi: 600, bleedOn: false, bleedMm: 1, clip: 'contour', cameraHole: true, mirror: true }, orderId: 'PED-9' });
  const s = store.getState();
  assert.deepEqual(s.project, project);
  assert.equal(s.exportOptions.clip, 'contour');
  assert.equal(s.orderId, 'PED-9');
  assert.equal(store.canUndo(), false);
  assert.deepEqual([...store.referencedImageIds()], ['img9']);
});

test('setExportOptions, setOrderId and setUi do not touch the history', () => {
  const store = createStore();
  store.setExportOptions({ dpi: 150 });
  store.setOrderId('PED');
  store.setUi({ tab: 'export' });
  assert.equal(store.canUndo(), false);
  assert.equal(store.getState().ui.tab, 'export');
});

test('setOrderId cuts the text at 40 characters', () => {
  const store = createStore();
  store.setOrderId('a'.repeat(45));
  assert.equal(store.getState().orderId, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(store.getState().orderId.length, 40);
});

test('subscribers get (state, prev) synchronously and can unsubscribe', () => {
  const store = createStore();
  const seen = [];
  const unsubscribe = store.subscribe((state, prev) => seen.push([state, prev]));
  const before = store.getState();
  store.setUi({ tab: 'images' });
  assert.equal(seen.length, 1);
  assert.equal(seen[0][1], before);
  assert.equal(seen[0][0], store.getState());
  unsubscribe();
  store.setUi({ tab: 'export' });
  assert.equal(seen.length, 1);
});

test('a subscriber is not called for a no-op', () => {
  const store = createStore();
  let calls = 0;
  store.subscribe(() => calls++);
  store.updateProject((p) => p);
  store.setUi({ tab: 'model' });
  store.setExportOptions({ dpi: 300 });
  store.setOrderId('');
  store.commit(null, 1000);
  assert.equal(store.undo(), false);
  assert.equal(store.redo(), false);
  assert.equal(calls, 0);
});
