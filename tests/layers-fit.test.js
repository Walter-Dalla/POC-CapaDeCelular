import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLayer, fillLayer, fitLayer, centreLayer } from '../js/layers.js';
import { layerSize } from '../js/geometry.js';

// iPhone 15: case 71.6 x 147.6 mm, bleed 2, so case + bleed = 75.6 x 151.6 mm.
const iphone15 = {
  id: 'apple-iphone-15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [],
  bleed: 2,
};

// Equal to 2 decimals.
function near2(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 0.005, `expected ${expected}, got ${actual}`);
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function project(naturalWidth, naturalHeight, extra = {}) {
  return deepFreeze({
    modelId: 'apple-iphone-15',
    customModel: null,
    background: '#FFFFFF',
    layers: [
      {
        id: 'a',
        name: 'foto',
        imageId: 'img',
        naturalWidth,
        naturalHeight,
        cx: 12,
        cy: -9,
        width: 30,
        rotation: 33,
        crop: { x: 0, y: 0, width: 1, height: 1 },
        ...extra,
      },
    ],
  });
}

test('fill of a 400 x 733 image: width 82.73, height 151.6, centred, no rotation', () => {
  // Image height / width = 1.8325; 151.6 / 1.8325 = 82.73 > 75.6.
  const layer = fillLayer(project(400, 733), 'a', iphone15, 2).layers[0];
  near2(layer.width, 82.73);
  near2(layerSize(layer).height, 151.6);
  assert.equal(layer.cx, 0);
  assert.equal(layer.cy, 0);
  assert.equal(layer.rotation, 0);
});

test('fit of a 400 x 733 image: width 71.6, height 131.21', () => {
  // 147.6 / 1.8325 = 80.55 > 71.6, so the width limits: 71.6 x 1.8325 = 131.21.
  const layer = fitLayer(project(400, 733), 'a', iphone15).layers[0];
  near2(layer.width, 71.6);
  near2(layerSize(layer).height, 131.21);
  assert.equal(layer.cx, 0);
  assert.equal(layer.cy, 0);
  assert.equal(layer.rotation, 0);
});

test('a 1000 x 500 image: fill width 303.2 (height 151.6), fit width 71.6', () => {
  const filled = fillLayer(project(1000, 500), 'a', iphone15, 2).layers[0];
  near2(filled.width, 303.2);
  near2(layerSize(filled).height, 151.6);
  const fitted = fitLayer(project(1000, 500), 'a', iphone15).layers[0];
  near2(fitted.width, 71.6);
  near2(layerSize(fitted).height, 35.8);
});

test('fill uses the cropped aspect: 400 x 733 with half height crop → 165.46', () => {
  // Visible part 400 x 366.5 px; 151.6 x 400 / 366.5 = 165.46.
  const p = project(400, 733, { crop: { x: 0, y: 0, width: 1, height: 0.5 } });
  const layer = fillLayer(p, 'a', iphone15, 2).layers[0];
  near2(layer.width, 165.46);
  near2(layerSize(layer).height, 151.6);
});

test('centreLayer keeps size and rotation', () => {
  const layer = centreLayer(project(400, 733), 'a').layers[0];
  assert.equal(layer.cx, 0);
  assert.equal(layer.cy, 0);
  assert.equal(layer.width, 30);
  assert.equal(layer.rotation, 33);
});

test('createLayer equals fillLayer of a fresh layer', () => {
  const created = createLayer(
    { id: 'a', name: 'foto', imageId: 'img', naturalWidth: 400, naturalHeight: 733 },
    iphone15,
    2,
  );
  const filled = fillLayer(project(400, 733), 'a', iphone15, 2).layers[0];
  assert.deepEqual(created, filled);
});

test('unknown id returns the same project', () => {
  const p = project(400, 733);
  assert.equal(fillLayer(p, 'x', iphone15, 2), p);
  assert.equal(fitLayer(p, 'x', iphone15), p);
  assert.equal(centreLayer(p, 'x'), p);
});
