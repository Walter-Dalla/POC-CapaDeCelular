import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGestures, pinchStep, wheelFactor } from '../js/gestures.js';
import { createStore } from '../js/state.js';

const MODEL = { id: 'custom', case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [], bleed: 2 };

// A 20 × 20 mm layer at the origin on the Imagens tab, at 4 px per mm.
function setup(ui = { selectedLayerId: 'a' }) {
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
  store.setUi({ tab: 'images', ...ui });
  const gestures = createGestures({ state: store, stage: { pxPerMm: () => 4 }, model: () => MODEL });
  return { store, gestures, layer: () => store.getState().project.layers[0] };
}

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not ${expected}`);
}

test('wheelFactor: no wheel movement keeps the size', () => {
  assert.equal(wheelFactor(0), 1);
});

test('wheelFactor: wheel up by 100 grows about 16%', () => {
  near(wheelFactor(-100), 1.162, 0.001);
});

test('wheelFactor: one event never grows more than 1.25 nor shrinks under 0.8', () => {
  assert.equal(wheelFactor(-10000), 1.25);
  assert.equal(wheelFactor(10000), 0.8);
});

test('pinchStep: fingers twice as far apart and turned a quarter clockwise', () => {
  const start = { a: { x: -10, y: 0 }, b: { x: 10, y: 0 } };
  const step = pinchStep(start, { x: 0, y: -20 }, { x: 0, y: 20 });
  near(step.factor, 2);
  near(step.rotation, 90);
});

test('pinch: scales and turns the selected layer, never drags it, one undo step', () => {
  const { store, gestures, layer } = setup();
  gestures.pointerDown(1, { x: -5, y: 0 });
  gestures.pointerDown(2, { x: 5, y: 0 });
  gestures.pointerMove(1, { x: 0, y: -10 });
  gestures.pointerMove(2, { x: 0, y: 10 });
  near(layer().width, 40);
  near(layer().rotation, 90);
  assert.deepEqual([layer().cx, layer().cy], [0, 0]);
  gestures.pointerUp(1, { x: 0, y: -10 });
  // The finger left on the glass does not start a drag.
  gestures.pointerMove(2, { x: 30, y: 30 });
  gestures.pointerUp(2, { x: 30, y: 30 });
  assert.deepEqual([layer().cx, layer().cy], [0, 0]);
  assert.equal(store.undo(), true);
  assert.equal(layer().width, 20);
  assert.equal(layer().rotation, 0);
  assert.equal(store.canUndo(), false);
});

test('pinch: a first finger that dragged shares the pinch undo step', () => {
  const { store, gestures, layer } = setup();
  gestures.pointerDown(1, { x: 0, y: 0 });
  gestures.pointerMove(1, { x: 5, y: 0 });
  gestures.pointerDown(2, { x: 15, y: 0 });
  gestures.pointerMove(2, { x: 25, y: 0 });
  gestures.pointerUp(2, { x: 25, y: 0 });
  gestures.pointerUp(1, { x: 5, y: 0 });
  near(layer().width, 40);
  assert.deepEqual([layer().cx, layer().cy], [5, 0]);
  assert.equal(store.undo(), true);
  assert.deepEqual([layer().cx, layer().cy, layer().width], [0, 0, 20]);
  assert.equal(store.canUndo(), false);
});

test('pinch: without a selected layer two fingers change nothing', () => {
  const { store, gestures, layer } = setup({ selectedLayerId: null });
  gestures.pointerDown(1, { x: 30, y: 30 });
  gestures.pointerDown(2, { x: 40, y: 30 });
  gestures.pointerMove(2, { x: 60, y: 30 });
  gestures.pointerUp(1, { x: 30, y: 30 });
  gestures.pointerUp(2, { x: 60, y: 30 });
  assert.equal(layer().width, 20);
  assert.equal(store.canUndo(), false);
});

test('wheel: scales the selected layer, a burst is one undo step', () => {
  const { store, gestures, layer } = setup();
  assert.equal(gestures.wheel(-10000), true);
  assert.equal(gestures.wheel(-10000), true);
  near(layer().width, 31.25);
  assert.equal(store.undo(), true);
  assert.equal(layer().width, 20);
  assert.equal(store.canUndo(), false);
});

test('wheel: unused without a selected layer or in crop mode', () => {
  assert.equal(setup({ selectedLayerId: null }).gestures.wheel(-100), false);
  const cropping = setup({ selectedLayerId: 'a', cropLayerId: 'a' });
  assert.equal(cropping.gestures.wheel(-100), false);
  assert.equal(cropping.layer().width, 20);
});

test('pinchStep: fingers that do not move change nothing', () => {
  const start = { a: { x: 3, y: 4 }, b: { x: 9, y: 12 } };
  const step = pinchStep(start, { x: 3, y: 4 }, { x: 9, y: 12 });
  assert.deepEqual(step, { factor: 1, rotation: 0 });
});
