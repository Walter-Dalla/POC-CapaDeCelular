import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropFrame, cropRectOnCover, editDrawPlan } from '../js/stage.js';

const LAYER = {
  id: 'layer-1',
  name: 'foto.png',
  imageId: 'image-1',
  naturalWidth: 400,
  naturalHeight: 400,
  cx: 10,
  cy: 0,
  width: 20,
  rotation: 0,
  crop: { x: 0.5, y: 0, width: 0.5, height: 1 },
};

// Rect with every number rounded to 6 decimals, so -0 and float noise compare equal.
function rounded(rect) {
  return Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, Math.round(value * 1e6) / 1e6 + 0]));
}

test('cropFrame: the whole image keeps the visible right half where the layer shows it', () => {
  assert.deepEqual(rounded(cropFrame(LAYER)), { cx: 0, cy: 0, width: 40, height: 40, rotation: 0 });
});

test('cropRectOnCover: the top-left quarter of the image', () => {
  assert.deepEqual(rounded(cropRectOnCover(LAYER, { x: 0, y: 0, width: 0.5, height: 0.5 })), {
    cx: -10,
    cy: -10,
    width: 20,
    height: 20,
    rotation: 0,
  });
});

test('cropRectOnCover: the layer own crop is the visible part of the layer', () => {
  assert.deepEqual(rounded(cropRectOnCover(LAYER, LAYER.crop)), { cx: 10, cy: 0, width: 20, height: 40, rotation: 0 });
});

test('cropFrame: the same layer rotated 90 degrees clockwise', () => {
  assert.deepEqual(rounded(cropFrame({ ...LAYER, rotation: 90 })), { cx: 10, cy: -10, width: 40, height: 40, rotation: 90 });
});

test('cropFrame: a layer without crop is its own frame', () => {
  const { crop, ...plain } = LAYER;
  assert.deepEqual(rounded(cropFrame(plain)), { cx: 10, cy: 0, width: 20, height: 20, rotation: 0 });
});

test('editDrawPlan: crop mode ends with the crop step and no selection', () => {
  const model = { case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [], bleed: 2 };
  const state = {
    project: { layers: [LAYER], background: '#FFFFFF' },
    ui: { tab: 'images', selectedLayerId: 'layer-1', cropLayerId: 'layer-1', cropDraft: null, showSafeMargin: false, guides: { v: false, h: false } },
  };
  assert.deepEqual(editDrawPlan(state, model), ['shadow', 'background', 'layers-faded', 'layers-clipped', 'contour', 'bleed', 'crop']);
});
