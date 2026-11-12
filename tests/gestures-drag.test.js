import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGestures, dragMove, hitTest } from '../js/gestures.js';
import { createStore } from '../js/state.js';

const MODEL = { id: 'custom', case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [], bleed: 2 };

// A store with the layers on the Imagens tab and the gestures wired to it, at 4 px per mm.
function setup(layers, ui = {}) {
  const store = createStore();
  store.loadProject({ project: { layers } });
  store.setUi({ tab: 'images', ...ui });
  const gestures = createGestures({ state: store, stage: { pxPerMm: () => 4 }, model: () => MODEL });
  store.subscribe(gestures.follow);
  return { store, gestures };
}

function only(store) {
  return store.getState().project.layers[0];
}

// Square image, so a layer's height equals its width unless the crop says otherwise.
function layer(id, cx, cy, width, extra = {}) {
  return {
    id,
    name: `${id}.png`,
    imageId: `image-${id}`,
    naturalWidth: 100,
    naturalHeight: 100,
    cx,
    cy,
    width,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
    ...extra,
  };
}

test('dragMove: the grabbed point stays under the pointer', () => {
  const start = { cx: 10, cy: 10, x: 12, y: 14 };
  assert.deepEqual(dragMove(start, { x: 22, y: 34 }), { cx: 20, cy: 30, guides: { v: false, h: false } });
});

test('dragMove: a centre within 1.5 mm of 0 snaps on both axes and lights both guides', () => {
  const start = { cx: 10, cy: 10, x: 12, y: 14 };
  assert.deepEqual(dragMove(start, { x: 3, y: 4.5 }), { cx: 0, cy: 0, guides: { v: true, h: true } });
});

test('dragMove: only the axis near 0 snaps', () => {
  const start = { cx: 0, cy: 0, x: 0, y: 0 };
  assert.deepEqual(dragMove(start, { x: 1, y: 8 }), { cx: 0, cy: 8, guides: { v: true, h: false } });
});

test('hitTest: picks the top one of two overlapping layers', () => {
  const layers = [layer('bottom', 0, 0, 40), layer('top', 10, 0, 40)];
  assert.deepEqual(hitTest(layers, { x: 5, y: 0 }, 4, null), { layerId: 'top', part: 'body' });
  assert.deepEqual(hitTest(layers, { x: -15, y: 0 }, 4, null), { layerId: 'bottom', part: 'body' });
});

test('hitTest: an empty spot hits nothing', () => {
  assert.equal(hitTest([layer('a', 0, 0, 10)], { x: 30, y: 30 }, 4, null), null);
});

test('hitTest: respects the rotation of the layer', () => {
  // 40 × 10 mm turned 90°: it spans 10 mm across and 40 mm down.
  const wide = layer('wide', 0, 0, 40, { naturalWidth: 400, naturalHeight: 100, rotation: 90 });
  assert.deepEqual(hitTest([wide], { x: 0, y: 15 }, 4, null), { layerId: 'wide', part: 'body' });
  assert.equal(hitTest([wide], { x: 15, y: 0 }, 4, null), null);
});

test('hitTest: a handle is hit only on the selected layer', () => {
  // 20 × 20 mm at the origin, 4 px per mm: the se corner is at (10, 10), 22 px = 5.5 mm.
  const layers = [layer('a', 0, 0, 20)];
  assert.deepEqual(hitTest(layers, { x: 14, y: 13 }, 4, 'a'), { layerId: 'a', part: 'se' });
  assert.equal(hitTest(layers, { x: 14, y: 13 }, 4, null), null);
  assert.deepEqual(hitTest(layers, { x: 9, y: 9 }, 4, null), { layerId: 'a', part: 'body' });
});

test('hitTest: the rotate handle sits 50 px above the top edge', () => {
  // Top edge at y = −10; 50 px at 4 px per mm = 12.5 mm higher, at y = −22.5.
  const layers = [layer('a', 0, 0, 20)];
  assert.deepEqual(hitTest(layers, { x: 1, y: -22 }, 4, 'a'), { layerId: 'a', part: 'rotate' });
  assert.deepEqual(hitTest(layers, { x: -10, y: -10 }, 4, 'a'), { layerId: 'a', part: 'nw' });
  assert.deepEqual(hitTest(layers, { x: 10, y: -10 }, 4, 'a'), { layerId: 'a', part: 'ne' });
  assert.deepEqual(hitTest(layers, { x: -10, y: 10 }, 4, 'a'), { layerId: 'a', part: 'sw' });
});

test('drag: selects the layer, moves it with the guides and makes one undo step on release', () => {
  const { store, gestures } = setup([layer('a', 10, 10, 20)]);
  assert.equal(gestures.pointerDown(1, { x: 12, y: 14 }), true);
  assert.equal(store.getState().ui.selectedLayerId, 'a');
  gestures.pointerMove(1, { x: 15, y: 14 });
  gestures.pointerMove(1, { x: 3, y: 4.5 });
  assert.deepEqual([only(store).cx, only(store).cy], [0, 0]);
  assert.deepEqual(store.getState().ui.guides, { v: true, h: true });
  gestures.pointerMove(1, { x: 22, y: 34 });
  gestures.pointerUp(1, { x: 22, y: 34 });
  assert.deepEqual([only(store).cx, only(store).cy], [20, 30]);
  assert.deepEqual(store.getState().ui.guides, { v: false, h: false });
  assert.equal(store.undo(), true);
  assert.deepEqual([only(store).cx, only(store).cy], [10, 10]);
  assert.equal(store.canUndo(), false);
});

test('drag: a click without movement makes no undo step', () => {
  const { store, gestures } = setup([layer('a', 0, 0, 20)]);
  gestures.pointerDown(1, { x: 1, y: 1 });
  gestures.pointerUp(1, { x: 1, y: 1 });
  assert.equal(store.getState().ui.selectedLayerId, 'a');
  assert.equal(store.canUndo(), false);
});

test('drag: a press on an empty spot clears the selection', () => {
  const { store, gestures } = setup([layer('a', 0, 0, 20)], { selectedLayerId: 'a' });
  gestures.pointerDown(1, { x: 30, y: 30 });
  gestures.pointerMove(1, { x: 0, y: 0 });
  gestures.pointerUp(1, { x: 0, y: 0 });
  assert.equal(store.getState().ui.selectedLayerId, null);
  assert.deepEqual([only(store).cx, only(store).cy], [0, 0]);
  assert.equal(store.canUndo(), false);
});

test('drag: the centre stays within the case plus bleed', () => {
  const { store, gestures } = setup([layer('a', 0, 0, 20)]);
  gestures.pointerDown(1, { x: 0, y: 0 });
  gestures.pointerMove(1, { x: 500, y: -500 });
  gestures.pointerUp(1, { x: 500, y: -500 });
  // Half of 71.6 plus 2 mm of bleed; half of 147.6 plus 2.
  assert.deepEqual([only(store).cx, only(store).cy], [37.8, -75.8]);
});

test('drag: the pointer is ignored on the Exportar tab', () => {
  const { store, gestures } = setup([layer('a', 0, 0, 20)], { tab: 'export' });
  assert.equal(gestures.pointerDown(1, { x: 0, y: 0 }), false);
  gestures.pointerMove(1, { x: 10, y: 10 });
  gestures.pointerUp(1, { x: 10, y: 10 });
  assert.equal(store.getState().ui.selectedLayerId, null);
  assert.deepEqual([only(store).cx, only(store).cy], [0, 0]);
});
