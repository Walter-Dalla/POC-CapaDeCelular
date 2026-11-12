import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsConfirm, hasUnsavedWork, createAutosave } from '../js/draft.js';

const LAYER = {
  id: 'l1',
  name: 'a.png',
  imageId: 'img1',
  naturalWidth: 100,
  naturalHeight: 100,
  cx: 0,
  cy: 0,
  width: 30,
  rotation: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
};

test('needsConfirm is false without layers', () => {
  assert.equal(needsConfirm({ layers: [] }), false);
});

test('needsConfirm is true with one layer', () => {
  assert.equal(needsConfirm({ layers: [LAYER] }), true);
});

test('hasUnsavedWork: saved and idle', () => {
  assert.equal(hasUnsavedWork({ pending: false, draftAvailable: true, layerCount: 2 }), false);
});

test('hasUnsavedWork: a save pending', () => {
  assert.equal(hasUnsavedWork({ pending: true, draftAvailable: true, layerCount: 0 }), true);
});

test('hasUnsavedWork: draft unavailable with layers', () => {
  assert.equal(hasUnsavedWork({ pending: false, draftAvailable: false, layerCount: 1 }), true);
});

test('hasUnsavedWork: draft unavailable without layers', () => {
  assert.equal(hasUnsavedWork({ pending: false, draftAvailable: false, layerCount: 0 }), false);
});

test('cancel drops a pending save', async () => {
  const timers = [];
  let saves = 0;
  const autosave = createAutosave({
    save: () => {
      saves += 1;
    },
    setTimer: (fn) => timers.push(fn) - 1,
    clearTimer: (id) => {
      timers[id] = null;
    },
  });
  autosave.touch();
  autosave.cancel();
  assert.equal(autosave.pending(), false);
  for (const fn of timers) if (fn) fn();
  await autosave.flush();
  assert.equal(saves, 0);
});
