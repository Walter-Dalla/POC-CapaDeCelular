import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampCrop, setCrop, resetCrop } from '../js/layers.js';
import { layerSize } from '../js/geometry.js';

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

// 400 x 400 px image shown 40 mm wide: 0.1 mm per image pixel.
function project(rotation) {
  return deepFreeze({
    modelId: 'apple-iphone-15',
    customModel: null,
    background: '#FFFFFF',
    layers: [
      {
        id: 'a',
        name: 'foto',
        imageId: 'img',
        naturalWidth: 400,
        naturalHeight: 400,
        cx: 0,
        cy: 0,
        width: 40,
        rotation,
        crop: { x: 0, y: 0, width: 1, height: 1 },
      },
    ],
  });
}

const rightHalf = { x: 0.5, y: 0, width: 0.5, height: 1 };

test('setCrop to the right half: width 20, height 40, centre (10, 0)', () => {
  const layer = setCrop(project(0), 'a', rightHalf).layers[0];
  assert.deepEqual(layer.crop, rightHalf);
  near(layer.width, 20);
  near(layerSize(layer).height, 40);
  near(layer.cx, 10);
  near(layer.cy, 0);
});

test('setCrop with rotation 90 moves the centre along the turned axis: (0, 10)', () => {
  const layer = setCrop(project(90), 'a', rightHalf).layers[0];
  near(layer.width, 20);
  near(layer.cx, 0);
  near(layer.cy, 10);
  assert.equal(layer.rotation, 90);
});

test('resetCrop brings back width 40 and centre (0, 0)', () => {
  for (const rotation of [0, 90]) {
    const cropped = setCrop(project(rotation), 'a', rightHalf);
    const layer = resetCrop(cropped, 'a').layers[0];
    assert.deepEqual(layer.crop, { x: 0, y: 0, width: 1, height: 1 });
    near(layer.width, 40);
    near(layer.cx, 0);
    near(layer.cy, 0);
  }
});

test('setCrop clamps the crop it stores', () => {
  const layer = setCrop(project(0), 'a', { x: 0.98, y: -1, width: 0.5, height: 0.01 }).layers[0];
  assert.deepEqual(layer.crop, { x: 0.5, y: 0, width: 0.5, height: 0.05 });
});

test('clampCrop shifts the rectangle back inside before shrinking it', () => {
  assert.deepEqual(clampCrop({ x: 0.98, y: -1, width: 0.5, height: 0.01 }), {
    x: 0.5,
    y: 0,
    width: 0.5,
    height: 0.05,
  });
  assert.deepEqual(clampCrop({ x: 0.2, y: 0.3, width: 0.4, height: 0.5 }), {
    x: 0.2,
    y: 0.3,
    width: 0.4,
    height: 0.5,
  });
  assert.deepEqual(clampCrop({ x: -0.5, y: 0, width: 3, height: 1 }), {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});

test('unknown id returns the same project', () => {
  const p = project(0);
  assert.equal(setCrop(p, 'x', rightHalf), p);
  assert.equal(resetCrop(p, 'x'), p);
});
