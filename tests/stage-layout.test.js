import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageLayout, stageLabel, legendItems, emptyBox, isDarkColour, stageView } from '../js/stage.js';

const IPHONE_15 = {
  id: 'apple-iphone-15',
  brand: 'Apple',
  name: 'iPhone 15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
  verified: false,
};

const UI = { tab: 'model', selectedLayerId: null, cropLayerId: null, cropDraft: null, showSafeMargin: true, guides: { v: false, h: false } };

test('stageLayout: the case plus the margin fits the box, centred', () => {
  const layout = stageLayout(420, 700, IPHONE_15, 8);
  assert.equal(Math.round(layout.scale * 1000) / 1000, 4.279);
  assert.equal(layout.originX, 210);
  assert.equal(layout.originY, 350);
});

test('stageLayout: a wide box is limited by its height, a tall one by its width', () => {
  assert.equal(Math.round(stageLayout(1000, 163.6, IPHONE_15, 8).scale * 1000) / 1000, 1);
  assert.equal(Math.round(stageLayout(87.6, 1000, IPHONE_15, 8).scale * 1000) / 1000, 1);
});

test('stageLabel: no image, one image, two images', () => {
  assert.equal(stageLabel(IPHONE_15, 0), 'Capa do iPhone 15, sem imagens');
  assert.equal(stageLabel(IPHONE_15, 1), 'Capa do iPhone 15 com 1 imagem');
  assert.equal(stageLabel(IPHONE_15, 2), 'Capa do iPhone 15 com 2 imagens');
});

test('legendItems: edit view without layers', () => {
  assert.deepEqual(legendItems('empty', IPHONE_15, UI), ['Vista traseira · iPhone 15', 'Sangria 2 mm']);
});

test('legendItems: edit view with layers, safe margin shown and hidden', () => {
  assert.deepEqual(legendItems('edit', IPHONE_15, UI), [
    'Contorno da capa',
    'Sangria 2 mm',
    'Fora da impressão',
    'Margem de segurança 3 mm',
  ]);
  assert.deepEqual(legendItems('edit', IPHONE_15, { ...UI, showSafeMargin: false }), [
    'Contorno da capa',
    'Sangria 2 mm',
    'Fora da impressão',
  ]);
});

test('legendItems: preview view', () => {
  assert.deepEqual(legendItems('preview', IPHONE_15, UI), ['Onde a capa será cortada (não sai no arquivo)']);
});

test('stageView: export tab, no layers, layers', () => {
  const layer = { id: 'a' };
  assert.equal(stageView({ project: { layers: [layer] }, ui: { ...UI, tab: 'export' } }), 'preview');
  assert.equal(stageView({ project: { layers: [] }, ui: UI }), 'empty');
  assert.equal(stageView({ project: { layers: [layer] }, ui: { ...UI, tab: 'images' } }), 'edit');
});

test('emptyBox: the case rectangle with the text below the camera cutout', () => {
  const box = emptyBox({ scale: 4, originX: 200, originY: 350 }, IPHONE_15);
  const rounded = Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Math.round(value * 1000) / 1000]));
  assert.deepEqual(rounded, {
    left: 56.8,
    top: 54.8,
    width: 286.4,
    height: 590.4,
    paddingTop: 164,
  });
});

test('emptyBox: no cutout in the top third leaves the padding alone', () => {
  const model = { ...IPHONE_15, cutouts: [] };
  assert.equal(emptyBox({ scale: 4, originX: 200, originY: 350 }, model).paddingTop, null);
});

test('isDarkColour: white and yellow are light, the theme greens and black are dark', () => {
  assert.equal(isDarkColour('#FFFFFF'), false);
  assert.equal(isDarkColour('#FFD447'), false);
  assert.equal(isDarkColour('#102B26'), true);
  assert.equal(isDarkColour('#000'), true);
});
