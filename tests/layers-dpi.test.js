import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveDpi, isLowRes, lowResLayers, LOW_DPI } from '../js/layers.js';

function layer(id, naturalWidth, width, cropWidth = 1) {
  return {
    id,
    name: id,
    imageId: `img-${id}`,
    naturalWidth,
    naturalHeight: naturalWidth,
    cx: 0,
    cy: 0,
    width,
    rotation: 0,
    crop: { x: 0, y: 0, width: cropWidth, height: 1 },
  };
}

test('LOW_DPI is 150', () => {
  assert.equal(LOW_DPI, 150);
});

test('480 px across 54.9 mm prints at 222 DPI, not low', () => {
  const l = layer('a', 480, 54.9);
  assert.equal(Math.round(effectiveDpi(l)), 222);
  assert.equal(isLowRes(l), false);
});

test('400 px across 85.92 mm prints at 118 DPI, low', () => {
  const l = layer('a', 400, 85.92);
  assert.equal(Math.round(effectiveDpi(l)), 118);
  assert.equal(isLowRes(l), true);
});

test('exactly 150 DPI is not low (300 px across 50.8 mm)', () => {
  const l = layer('a', 300, 50.8);
  assert.equal(effectiveDpi(l), 150);
  assert.equal(isLowRes(l), false);
});

test('a half-width crop halves the pixels: 480 px, crop 0.5, 54.9 mm → 111', () => {
  assert.equal(Math.round(effectiveDpi(layer('a', 480, 54.9, 0.5))), 111);
});

test('a layer without crop counts the whole image', () => {
  const l = layer('a', 480, 54.9);
  delete l.crop;
  assert.equal(Math.round(effectiveDpi(l)), 222);
});

test('lowResLayers lists the low layers, top first', () => {
  const project = {
    modelId: 'apple-iphone-15',
    customModel: null,
    background: '#FFFFFF',
    layers: [layer('bottom', 400, 85.92), layer('ok', 480, 54.9), layer('top', 480, 54.9, 0.5)],
  };
  assert.deepEqual(
    lowResLayers(project).map((l) => l.id),
    ['top', 'bottom'],
  );
  assert.deepEqual(project.layers.map((l) => l.id), ['bottom', 'ok', 'top']);
});
