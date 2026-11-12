import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dragMove, hitTest } from '../js/gestures.js';

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
