import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editDrawPlan } from '../js/stage.js';

const IPHONE_15 = {
  id: 'apple-iphone-15',
  brand: 'Apple',
  name: 'iPhone 15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
  verified: false,
};

const LAYER = {
  id: 'layer-1',
  name: 'foto.png',
  imageId: 'image-1',
  naturalWidth: 400,
  naturalHeight: 300,
  cx: 0,
  cy: 0,
  width: 40,
  rotation: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
};

const UI = { tab: 'images', selectedLayerId: null, cropLayerId: null, cropDraft: null, showSafeMargin: true, guides: { v: false, h: false } };

function state(layers, ui = {}) {
  return { project: { modelId: 'apple-iphone-15', layers, background: '#FFFFFF' }, ui: { ...UI, ...ui } };
}

test('editDrawPlan: no layers', () => {
  assert.deepEqual(editDrawPlan(state([]), IPHONE_15), ['shadow', 'background', 'cutouts', 'bleed']);
});

test('editDrawPlan: layers with the safe margin hidden', () => {
  assert.deepEqual(editDrawPlan(state([LAYER], { showSafeMargin: false }), IPHONE_15), [
    'shadow',
    'background',
    'layers-faded',
    'layers-clipped',
    'cutouts',
    'contour',
    'bleed',
  ]);
});

test('editDrawPlan: a selected layer, safe margin shown', () => {
  assert.deepEqual(editDrawPlan(state([LAYER], { selectedLayerId: 'layer-1' }), IPHONE_15), [
    'shadow',
    'background',
    'layers-faded',
    'layers-clipped',
    'cutouts',
    'contour',
    'bleed',
    'safe-margin',
    'selection',
  ]);
});

test('editDrawPlan: both guides on', () => {
  assert.deepEqual(editDrawPlan(state([LAYER], { guides: { v: true, h: true } }), IPHONE_15), [
    'shadow',
    'background',
    'layers-faded',
    'layers-clipped',
    'cutouts',
    'contour',
    'bleed',
    'safe-margin',
    'guide-v',
    'guide-h',
  ]);
});

test('editDrawPlan: a selection while cropping draws no selection', () => {
  const plan = editDrawPlan(state([LAYER], { selectedLayerId: 'layer-1', cropLayerId: 'layer-1' }), IPHONE_15);
  assert.equal(plan.includes('selection'), false);
});

test('editDrawPlan: cropping on a model with cutouts keeps the cover marks over the image', () => {
  const draft = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
  const ui = { selectedLayerId: 'layer-1', cropLayerId: 'layer-1', cropDraft: draft, guides: { v: true, h: false } };
  assert.deepEqual(editDrawPlan(state([LAYER], ui), IPHONE_15), [
    'shadow',
    'background',
    'layers-faded',
    'layers-clipped',
    'crop-image',
    'cutouts',
    'contour',
    'bleed',
    'safe-margin',
    'guide-v',
    'crop-frame',
  ]);
});

test('editDrawPlan: cropping on a model without cutouts', () => {
  const custom = { ...IPHONE_15, id: 'custom', cutouts: [] };
  const ui = { selectedLayerId: 'layer-1', cropLayerId: 'layer-1' };
  assert.deepEqual(editDrawPlan(state([LAYER], ui), custom), [
    'shadow',
    'background',
    'layers-faded',
    'layers-clipped',
    'crop-image',
    'contour',
    'bleed',
    'safe-margin',
    'crop-frame',
  ]);
});

test('editDrawPlan: a crop naming a missing layer draws no crop steps', () => {
  const plan = editDrawPlan(state([LAYER], { cropLayerId: 'gone' }), IPHONE_15);
  assert.equal(plan.includes('crop-image'), false);
  assert.equal(plan.includes('crop-frame'), false);
});

test('editDrawPlan: a selection naming a missing layer draws no selection', () => {
  const plan = editDrawPlan(state([LAYER], { selectedLayerId: 'gone' }), IPHONE_15);
  assert.equal(plan.includes('selection'), false);
});

test('editDrawPlan: a model without cutouts skips the cutouts step', () => {
  const custom = { ...IPHONE_15, id: 'custom', cutouts: [] };
  assert.deepEqual(editDrawPlan(state([]), custom), ['shadow', 'background', 'bleed']);
});
