import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewCaption, previewRulers } from '../js/stage.js';

const IPHONE_15 = {
  id: 'apple-iphone-15',
  brand: 'Apple',
  name: 'iPhone 15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
  verified: false,
};

const OPTIONS = { format: 'png', dpi: 300, bleedOn: true, bleedMm: null, clip: 'rect', cameraHole: false, mirror: false };

test('previewCaption: whole rectangle with bleed', () => {
  assert.equal(previewCaption(OPTIONS, IPHONE_15), 'Prévia do arquivo · retângulo inteiro com sangria');
});

test('previewCaption: whole rectangle without bleed', () => {
  assert.equal(previewCaption({ ...OPTIONS, bleedOn: false }, IPHONE_15), 'Prévia do arquivo · retângulo inteiro sem sangria');
  assert.equal(previewCaption({ ...OPTIONS, bleedMm: 0 }, IPHONE_15), 'Prévia do arquivo · retângulo inteiro sem sangria');
});

test('previewCaption: clipped to the case contour', () => {
  assert.equal(previewCaption({ ...OPTIONS, clip: 'contour' }, IPHONE_15), 'Prévia do arquivo · no contorno da capa');
});

test('previewRulers: iPhone 15 with the model bleed of 2 mm', () => {
  assert.deepEqual(previewRulers(OPTIONS, IPHONE_15), { width: '75,6 mm', height: '151,6 mm' });
});

test('previewRulers: iPhone 15 with the bleed off', () => {
  assert.deepEqual(previewRulers({ ...OPTIONS, bleedOn: false }, IPHONE_15), { width: '71,6 mm', height: '147,6 mm' });
});

test('previewRulers: a chosen bleed of 3 mm', () => {
  assert.deepEqual(previewRulers({ ...OPTIONS, bleedMm: 3 }, IPHONE_15), { width: '77,6 mm', height: '153,6 mm' });
});
