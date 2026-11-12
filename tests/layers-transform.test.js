import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  layerBounds,
  moveLayer,
  moveLayerBy,
  setLayerWidth,
  scaleLayer,
  setRotation,
  rotateLayerBy,
  snapRotation,
  normalizeRotation,
} from '../js/layers.js';

const iphone15 = {
  id: 'apple-iphone-15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [],
  bleed: 2,
};

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

function project(extra = {}) {
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
        cx: 3,
        cy: 4,
        width: 40,
        rotation: 0,
        crop: { x: 0, y: 0, width: 1, height: 1 },
        ...extra,
      },
    ],
  });
}

const bounds = { halfWidth: 37.8, halfHeight: 75.8 };

test('layerBounds of the iPhone 15 with bleed 2 is 37.8 x 75.8', () => {
  const b = layerBounds(iphone15, 2);
  near(b.halfWidth, 37.8);
  near(b.halfHeight, 75.8);
});

test('moveLayer clamps the centre into the bounds', () => {
  const next = moveLayer(project(), 'a', 100, -200, bounds);
  assert.equal(next.layers[0].cx, 37.8);
  assert.equal(next.layers[0].cy, -75.8);
  const inside = moveLayer(project(), 'a', -10, 20, bounds);
  assert.equal(inside.layers[0].cx, -10);
  assert.equal(inside.layers[0].cy, 20);
});

test('moveLayerBy adds to the centre and clamps', () => {
  const next = moveLayerBy(project(), 'a', 2, -1, bounds);
  assert.equal(next.layers[0].cx, 5);
  assert.equal(next.layers[0].cy, 3);
  const far = moveLayerBy(project(), 'a', -500, 500, bounds);
  assert.equal(far.layers[0].cx, -37.8);
  assert.equal(far.layers[0].cy, 75.8);
});

test('setLayerWidth clamps to 5–2000 mm and keeps the centre', () => {
  assert.equal(setLayerWidth(project(), 'a', 1).layers[0].width, 5);
  assert.equal(setLayerWidth(project(), 'a', 5000).layers[0].width, 2000);
  const next = setLayerWidth(project(), 'a', 60);
  assert.equal(next.layers[0].width, 60);
  assert.equal(next.layers[0].cx, 3);
  assert.equal(next.layers[0].cy, 4);
});

test('scaleLayer multiplies the width, clamped', () => {
  assert.equal(scaleLayer(project(), 'a', 1.5).layers[0].width, 60);
  assert.equal(scaleLayer(project(), 'a', 0.01).layers[0].width, 5);
  assert.equal(scaleLayer(project(), 'a', 100).layers[0].width, 2000);
  assert.equal(scaleLayer(project(), 'a', 2).layers[0].cx, 3);
});

test('setRotation normalises into (-180, 180]', () => {
  assert.equal(setRotation(project(), 'a', 190).layers[0].rotation, -170);
  assert.equal(setRotation(project(), 'a', -180).layers[0].rotation, 180);
  assert.equal(setRotation(project(), 'a', 360).layers[0].rotation, 0);
  assert.equal(setRotation(project(), 'a', 180).layers[0].rotation, 180);
  assert.equal(setRotation(project(), 'a', -540).layers[0].rotation, 180);
  assert.ok(Object.is(normalizeRotation(-360), 0));
});

test('rotateLayerBy adds to the rotation and normalises', () => {
  const p = project({ rotation: 170 });
  assert.equal(rotateLayerBy(p, 'a', 20).layers[0].rotation, -170);
  assert.equal(rotateLayerBy(p, 'a', -10).layers[0].rotation, 160);
});

test('snapRotation rounds to the step', () => {
  assert.equal(snapRotation(22), 15);
  assert.equal(snapRotation(23), 30);
  assert.equal(snapRotation(-8), -15);
  assert.equal(snapRotation(44, 45), 45);
  assert.equal(snapRotation(-175), 180);
});

test('unknown id returns the same project', () => {
  const p = project();
  assert.equal(moveLayer(p, 'x', 1, 1, bounds), p);
  assert.equal(moveLayerBy(p, 'x', 1, 1, bounds), p);
  assert.equal(setLayerWidth(p, 'x', 10), p);
  assert.equal(scaleLayer(p, 'x', 2), p);
  assert.equal(setRotation(p, 'x', 10), p);
  assert.equal(rotateLayerBy(p, 'x', 10), p);
});
