import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropDrag, cropHit } from '../js/gestures.js';

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
