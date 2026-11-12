import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGestures, cropDrag, cropFollow, cropHit } from '../js/gestures.js';
import { createStore } from '../js/state.js';

const DRAFT = Object.freeze({ x: 0.2, y: 0.2, width: 0.6, height: 0.6 });

function near(actual, expected) {
  for (const key of Object.keys(expected)) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, `${key}: ${actual[key]} is not ${expected[key]}`);
  }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
}

test('cropDrag: the se corner moves, x and y stay', () => {
  near(cropDrag(DRAFT, 'se', 0.1, -0.1), { x: 0.2, y: 0.2, width: 0.7, height: 0.5 });
});

test('cropDrag: the nw corner moves, the se corner stays', () => {
  near(cropDrag(DRAFT, 'nw', 0.1, 0.1), { x: 0.3, y: 0.3, width: 0.5, height: 0.5 });
});

test('cropDrag: the ne and sw corners move their own sides', () => {
  near(cropDrag(DRAFT, 'ne', 0.1, 0.1), { x: 0.2, y: 0.3, width: 0.7, height: 0.5 });
  near(cropDrag(DRAFT, 'sw', 0.1, 0.1), { x: 0.3, y: 0.2, width: 0.5, height: 0.7 });
});

test('cropDrag: inside moves the rectangle and stops at the edge, same size', () => {
  near(cropDrag(DRAFT, 'inside', 0.5, 0), { x: 0.4, y: 0.2, width: 0.6, height: 0.6 });
  near(cropDrag(DRAFT, 'inside', -0.1, -0.5), { x: 0.1, y: 0, width: 0.6, height: 0.6 });
});

test('cropDrag: a corner dragged past the opposite one stops at 0.05 sides', () => {
  near(cropDrag(DRAFT, 'nw', 0.9, 0.9), { x: 0.75, y: 0.75, width: 0.05, height: 0.05 });
});

test('cropDrag: a corner stops at the edge of the image', () => {
  near(cropDrag(DRAFT, 'se', 0.5, 0.5), { x: 0.2, y: 0.2, width: 0.8, height: 0.8 });
  near(cropDrag(DRAFT, 'nw', -0.5, -0.5), { x: 0, y: 0, width: 0.8, height: 0.8 });
});

// A 100 × 100 px image shown 40 mm wide at the origin, uncropped: its frame
// spans −20 to 20 mm and the draft above spans −12 to 12 mm on both axes.
const LAYER = {
  id: 'layer-1',
  name: 'foto.png',
  imageId: 'image-1',
  naturalWidth: 100,
  naturalHeight: 100,
  cx: 0,
  cy: 0,
  width: 40,
  rotation: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
};

test('cropHit: corners of the draft within 22 px, the inside, and outside', () => {
  // 4 px per mm, so 22 px = 5.5 mm around each corner.
  assert.equal(cropHit(LAYER, DRAFT, { x: -12, y: -12 }, 4), 'nw');
  assert.equal(cropHit(LAYER, DRAFT, { x: 15, y: -14 }, 4), 'ne');
  assert.equal(cropHit(LAYER, DRAFT, { x: 12, y: 12 }, 4), 'se');
  assert.equal(cropHit(LAYER, DRAFT, { x: -13, y: 14 }, 4), 'sw');
  assert.equal(cropHit(LAYER, DRAFT, { x: 0, y: 0 }, 4), 'inside');
  assert.equal(cropHit(LAYER, DRAFT, { x: 19, y: 0 }, 4), null);
});

const UI = { tab: 'images', selectedLayerId: null, cropLayerId: null, cropDraft: null };
const FULL = { x: 0, y: 0, width: 1, height: 1 };

function snapshot(ui, layers = [LAYER]) {
  return { project: { layers }, ui: { ...UI, ...ui } };
}

test('cropFollow: entering crop mode selects the layer and starts the draft from its crop', () => {
  const prev = snapshot({});
  assert.deepEqual(cropFollow(snapshot({ cropLayerId: 'layer-1' }), prev), { selectedLayerId: 'layer-1', cropDraft: FULL });
});

test('cropFollow: a draft dropped by undo starts again from the crop', () => {
  const prev = snapshot({ cropLayerId: 'layer-1', selectedLayerId: 'layer-1', cropDraft: DRAFT });
  const next = snapshot({ cropLayerId: 'layer-1', selectedLayerId: 'layer-1', cropDraft: null });
  assert.deepEqual(cropFollow(next, prev), { cropDraft: FULL });
});

test('cropFollow: leaving the Imagens tab, removing the layer or selecting another one cancels', () => {
  const cropping = { cropLayerId: 'layer-1', selectedLayerId: 'layer-1', cropDraft: DRAFT };
  const prev = snapshot(cropping);
  const cancel = { cropLayerId: null, cropDraft: null };
  assert.deepEqual(cropFollow(snapshot({ ...cropping, tab: 'export' }), prev), cancel);
  assert.deepEqual(cropFollow(snapshot(cropping, []), prev), cancel);
  assert.deepEqual(cropFollow(snapshot({ ...cropping, selectedLayerId: 'other' }), prev), cancel);
});

test('cropFollow: nothing to do outside crop mode or while the draft changes', () => {
  assert.equal(cropFollow(snapshot({ selectedLayerId: 'layer-1' }), snapshot({})), null);
  const prev = snapshot({ cropLayerId: 'layer-1', selectedLayerId: 'layer-1', cropDraft: FULL });
  assert.equal(cropFollow(snapshot({ cropLayerId: 'layer-1', selectedLayerId: 'layer-1', cropDraft: DRAFT }), prev), null);
});

// LAYER and a second layer on the Imagens tab, gestures wired, at 4 px per mm.
function setup() {
  const store = createStore();
  store.loadProject({ project: { layers: [LAYER, { ...LAYER, id: 'layer-2', cx: 30 }] } });
  store.setUi({ tab: 'images' });
  const gestures = createGestures({
    state: store,
    stage: { pxPerMm: () => 4 },
    model: () => ({ id: 'custom', case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [], bleed: 2 }),
  });
  store.subscribe(gestures.follow);
  return { store, gestures, ui: () => store.getState().ui, first: () => store.getState().project.layers[0] };
}

test('crop mode: dragging a corner changes only the draft; apply is one undo step', () => {
  const { store, gestures, ui, first } = setup();
  store.setUi({ cropLayerId: 'layer-1' });
  assert.equal(ui().selectedLayerId, 'layer-1');
  assert.deepEqual(ui().cropDraft, FULL);
  // The whole image spans −20 to 20 mm; the se corner moves 4 mm in, 0.1 of the image.
  gestures.pointerDown(1, { x: 20, y: 20 });
  gestures.pointerMove(1, { x: 16, y: 16 });
  gestures.pointerUp(1, { x: 16, y: 16 });
  near(ui().cropDraft, { x: 0, y: 0, width: 0.9, height: 0.9 });
  assert.deepEqual(first().crop, FULL);
  assert.equal(store.canUndo(), false);
  gestures.applyCrop();
  near(first().crop, { x: 0, y: 0, width: 0.9, height: 0.9 });
  assert.equal(ui().cropLayerId, null);
  assert.equal(ui().cropDraft, null);
  assert.equal(store.undo(), true);
  assert.deepEqual(first().crop, FULL);
  assert.equal(store.canUndo(), false);
});

test('crop mode: whole image resets the draft, cancel leaves the layer as it was', () => {
  const { store, gestures, ui, first } = setup();
  store.setUi({ cropLayerId: 'layer-1' });
  store.setUi({ cropDraft: DRAFT });
  gestures.resetCrop();
  assert.deepEqual(ui().cropDraft, FULL);
  store.setUi({ cropDraft: DRAFT });
  gestures.cancelCrop();
  assert.equal(ui().cropLayerId, null);
  assert.equal(ui().cropDraft, null);
  assert.deepEqual(first().crop, FULL);
  assert.equal(store.canUndo(), false);
});

test('crop mode: selecting another layer or leaving the Imagens tab cancels it', () => {
  const { store, ui } = setup();
  store.setUi({ cropLayerId: 'layer-1' });
  store.setUi({ selectedLayerId: 'layer-2' });
  assert.equal(ui().cropLayerId, null);
  store.setUi({ cropLayerId: 'layer-1' });
  store.setUi({ tab: 'model' });
  assert.equal(ui().cropLayerId, null);
});

test('crop mode: a press outside the draft changes nothing', () => {
  const { store, gestures, ui } = setup();
  store.setUi({ cropLayerId: 'layer-1' });
  gestures.pointerDown(1, { x: 30, y: 0 });
  gestures.pointerMove(1, { x: 0, y: 0 });
  gestures.pointerUp(1, { x: 0, y: 0 });
  assert.equal(ui().selectedLayerId, 'layer-1');
  assert.deepEqual(ui().cropDraft, FULL);
});
