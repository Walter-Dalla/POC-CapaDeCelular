import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGestures, keyAction } from '../js/gestures.js';
import { createStore } from '../js/state.js';

const MODEL = { id: 'custom', case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [], bleed: 2 };

function layer(id) {
  return {
    id,
    name: `${id}.png`,
    imageId: `image-${id}`,
    naturalWidth: 100,
    naturalHeight: 100,
    cx: 0,
    cy: 0,
    width: 20,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}

// Layers 'a' (bottom) and 'b' (top) on the Imagens tab, 'a' selected.
function setup(ui = {}) {
  const store = createStore();
  store.loadProject({ project: { layers: [layer('a'), layer('b')] } });
  store.setUi({ tab: 'images', selectedLayerId: 'a', ...ui });
  const gestures = createGestures({ state: store, stage: { pxPerMm: () => 4 }, model: () => MODEL });
  const ids = () => store.getState().project.layers.map((item) => item.id);
  return { store, gestures, ids, first: () => store.getState().project.layers[0] };
}

function press(key, extra = {}) {
  return keyAction({ key, shiftKey: false, ctrlKey: false, metaKey: false, targetIsText: false, ...extra });
}

test('keyAction: arrows move 1 mm', () => {
  assert.deepEqual(press('ArrowLeft'), { type: 'move', dx: -1, dy: 0 });
  assert.deepEqual(press('ArrowRight'), { type: 'move', dx: 1, dy: 0 });
  assert.deepEqual(press('ArrowUp'), { type: 'move', dx: 0, dy: -1 });
  assert.deepEqual(press('ArrowDown'), { type: 'move', dx: 0, dy: 1 });
});

test('keyAction: arrows with Shift move 0.1 mm', () => {
  assert.deepEqual(press('ArrowLeft', { shiftKey: true }), { type: 'move', dx: -0.1, dy: 0 });
  assert.deepEqual(press('ArrowDown', { shiftKey: true }), { type: 'move', dx: 0, dy: 0.1 });
});

test('keyAction: Delete and Backspace remove', () => {
  assert.deepEqual(press('Delete'), { type: 'remove' });
  assert.deepEqual(press('Backspace'), { type: 'remove' });
});

test('keyAction: ] raises and [ lowers', () => {
  assert.deepEqual(press(']'), { type: 'raise' });
  assert.deepEqual(press('['), { type: 'lower' });
});

test('keyAction: Escape cancels and Enter confirms', () => {
  assert.deepEqual(press('Escape'), { type: 'cancel' });
  assert.deepEqual(press('Enter'), { type: 'confirm' });
});

test('keyAction: keys typed in a text field are not the stage’s', () => {
  assert.equal(press('Delete', { targetIsText: true }), null);
  assert.equal(press('ArrowLeft', { targetIsText: true }), null);
});

test('keyAction: shortcuts with Ctrl or Meta are not the stage’s', () => {
  assert.equal(press('z', { ctrlKey: true }), null);
  assert.equal(press('ArrowLeft', { metaKey: true }), null);
});

test('keys: a burst of arrows moves the selected layer as one undo step', () => {
  const { store, gestures, first } = setup();
  assert.equal(gestures.key({ type: 'move', dx: 1, dy: 0 }), true);
  gestures.key({ type: 'move', dx: 1, dy: 0 });
  gestures.key({ type: 'move', dx: 0, dy: -1 });
  assert.deepEqual([first().cx, first().cy], [2, -1]);
  assert.equal(store.undo(), true);
  assert.deepEqual([first().cx, first().cy], [0, 0]);
  assert.equal(store.canUndo(), false);
});

test('keys: raise and lower are one undo step each', () => {
  const { store, gestures, ids } = setup();
  gestures.key({ type: 'raise' });
  assert.deepEqual(ids(), ['b', 'a']);
  gestures.key({ type: 'lower' });
  assert.deepEqual(ids(), ['a', 'b']);
  assert.equal(store.undo(), true);
  assert.deepEqual(ids(), ['b', 'a']);
});

test('keys: remove deletes the selected layer, clears the selection, one undo step', () => {
  const { store, gestures, ids } = setup();
  gestures.key({ type: 'remove' });
  assert.deepEqual(ids(), ['b']);
  assert.equal(store.getState().ui.selectedLayerId, null);
  assert.equal(store.undo(), true);
  assert.deepEqual(ids(), ['a', 'b']);
});

test('keys: Escape clears the selection; without a selection the keys are unused', () => {
  const { store, gestures } = setup();
  assert.equal(gestures.key({ type: 'cancel' }), true);
  assert.equal(store.getState().ui.selectedLayerId, null);
  assert.equal(gestures.key({ type: 'cancel' }), false);
  assert.equal(gestures.key({ type: 'move', dx: 1, dy: 0 }), false);
  assert.equal(gestures.key({ type: 'remove' }), false);
  assert.equal(store.canUndo(), false);
});

test('keys: in crop mode only Escape and Enter are used', () => {
  const { store, gestures, first } = setup({ cropLayerId: 'a' });
  assert.equal(gestures.key({ type: 'move', dx: 1, dy: 0 }), false);
  assert.equal(gestures.key({ type: 'remove' }), false);
  assert.equal(first().cx, 0);
  assert.equal(gestures.key({ type: 'cancel' }), true);
  assert.equal(store.getState().ui.cropLayerId, null);
  assert.equal(store.getState().ui.selectedLayerId, 'a');
});

test('keyAction: other keys do nothing', () => {
  assert.equal(press('a'), null);
  assert.equal(press(' '), null);
});
