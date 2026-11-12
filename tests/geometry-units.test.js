import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pxPerMm,
  mmToPx,
  pxPerMeter,
  exportSize,
  effectiveBleed,
  layerSize,
  layerRect,
} from '../js/geometry.js';

const model = {
  id: 'apple-iphone-15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [],
  bleed: 2,
};

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, got ${actual}`,
  );
}

test('pxPerMm and mmToPx convert at the given resolution', () => {
  near(pxPerMm(25.4), 1);
  near(pxPerMm(254), 10);
  assert.equal(mmToPx(25.4, 300), 300);
  assert.equal(mmToPx(10, 300), 118);
});

test('exportSize with bleed 2 at 300 DPI', () => {
  const size = exportSize(model, 2, 300);
  near(size.widthMm, 75.6);
  near(size.heightMm, 151.6);
  assert.equal(size.widthPx, 893);
  assert.equal(size.heightPx, 1791);
});

test('exportSize with bleed 2 at 150 and 600 DPI', () => {
  const low = exportSize(model, 2, 150);
  assert.equal(low.widthPx, 446);
  assert.equal(low.heightPx, 895);
  const high = exportSize(model, 2, 600);
  assert.equal(high.widthPx, 1786);
  assert.equal(high.heightPx, 3581);
});

test('exportSize without bleed at 300 DPI', () => {
  const size = exportSize(model, 0, 300);
  near(size.widthMm, 71.6);
  near(size.heightMm, 147.6);
  assert.equal(size.widthPx, 846);
  assert.equal(size.heightPx, 1743);
});

test('pxPerMeter at 300, 150 and 600 DPI', () => {
  assert.equal(pxPerMeter(300), 11811);
  assert.equal(pxPerMeter(150), 5906);
  assert.equal(pxPerMeter(600), 23622);
});

test('effectiveBleed: off, model default, chosen value', () => {
  assert.equal(effectiveBleed({ bleedOn: false, bleedMm: 5 }, model), 0);
  assert.equal(effectiveBleed({ bleedOn: true, bleedMm: null }, model), 2);
  assert.equal(effectiveBleed({ bleedOn: true, bleedMm: 3.5 }, model), 3.5);
  assert.equal(effectiveBleed({ bleedOn: true, bleedMm: 0 }, model), 0);
});

const layer = {
  id: 'l1',
  name: 'foto',
  imageId: 'img1',
  naturalWidth: 400,
  naturalHeight: 800,
  cx: 5,
  cy: -10,
  width: 40,
  rotation: 30,
  crop: { x: 0, y: 0, width: 1, height: 1 },
};

test('layerSize follows the aspect ratio of the image', () => {
  assert.deepEqual(layerSize(layer), { width: 40, height: 80 });
});

test('layerSize follows the aspect ratio of the crop', () => {
  const cropped = { ...layer, crop: { x: 0, y: 0, width: 1, height: 0.5 } };
  assert.deepEqual(layerSize(cropped), { width: 40, height: 40 });
});

test('layerSize without crop uses the whole image', () => {
  const { crop, ...noCrop } = layer;
  assert.deepEqual(layerSize(noCrop), { width: 40, height: 80 });
});

test('layerRect carries centre, size and rotation', () => {
  assert.deepEqual(layerRect(layer), { cx: 5, cy: -10, width: 40, height: 80, rotation: 30 });
});
