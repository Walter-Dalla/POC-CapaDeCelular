import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGestures, rotateFromHandle, scaleFromHandle } from '../js/gestures.js';
import { createStore } from '../js/state.js';

const MODEL = { id: 'custom', case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [], bleed: 2 };

// A 20 × 20 mm layer at the origin, selected, on the Imagens tab, at 4 px per mm.
function setup() {
  const store = createStore();
  const layer = {
    id: 'a',
    name: 'a.png',
    imageId: 'image-a',
    naturalWidth: 100,
    naturalHeight: 100,
    cx: 0,
    cy: 0,
    width: 20,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
  store.loadProject({ project: { layers: [layer] } });
  store.setUi({ tab: 'images', selectedLayerId: 'a' });
  const gestures = createGestures({ state: store, stage: { pxPerMm: () => 4 }, model: () => MODEL });
  return { store, gestures, layer: () => store.getState().project.layers[0] };
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);
}

test('scaleFromHandle: pointer twice as far from the centre doubles the width', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 0, x: 20, y: 10 };
  near(scaleFromHandle(start, { x: 40, y: 20 }), 80);
});

test('scaleFromHandle: pointer half as far halves the width', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 0, x: 20, y: 10 };
  near(scaleFromHandle(start, { x: 10, y: 5 }), 20);
});

test('scaleFromHandle: measured from the layer centre, not the origin', () => {
  const start = { cx: 10, cy: 10, width: 30, rotation: 0, x: 20, y: 10 };
  near(scaleFromHandle(start, { x: 10, y: 40 }), 90);
});

test('rotateFromHandle: a quarter turn clockwise adds 90', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 0, x: 0, y: -30 };
  near(rotateFromHandle(start, { x: 30, y: 0 }, false), 90);
});

test('rotateFromHandle: start −8 swept +30 gives 22, with snap 15', () => {
  // Grab point straight right of the centre; the pointer 30° clockwise from it.
  const start = { cx: 0, cy: 0, width: 40, rotation: -8, x: 2, y: 0 };
  const pointer = { x: Math.sqrt(3), y: 1 };
  near(rotateFromHandle(start, pointer, false), 22);
  assert.equal(rotateFromHandle(start, pointer, true), 15);
});

test('corner handle: scales the selected layer around its centre, one undo step', () => {
  const { store, gestures, layer } = setup();
  gestures.pointerDown(1, { x: 10, y: 10 });
  gestures.pointerMove(1, { x: 15, y: 15 });
  gestures.pointerMove(1, { x: 20, y: 20 });
  gestures.pointerUp(1, { x: 20, y: 20 });
  near(layer().width, 40);
  assert.deepEqual([layer().cx, layer().cy], [0, 0]);
  assert.equal(store.undo(), true);
  assert.equal(layer().width, 20);
  assert.equal(store.canUndo(), false);
});

test('rotate handle: turns the layer, Shift snaps, one undo step', () => {
  const { store, gestures, layer } = setup();
  // The handle sits 50 px (12.5 mm) above the top edge at y = −10.
  gestures.pointerDown(1, { x: 0, y: -22.5 });
  gestures.pointerMove(1, { x: 22.5, y: -2 }, { shiftKey: true });
  assert.equal(layer().rotation, 90);
  gestures.pointerMove(1, { x: 22.5, y: 0 });
  gestures.pointerUp(1, { x: 22.5, y: 0 });
  near(layer().rotation, 90);
  assert.equal(store.undo(), true);
  assert.equal(layer().rotation, 0);
  assert.equal(store.canUndo(), false);
});

test('rotateFromHandle: the result stays within (−180, 180]', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 170, x: 0, y: -30 };
  near(rotateFromHandle(start, { x: 30, y: 0 }, false), -100);
});
