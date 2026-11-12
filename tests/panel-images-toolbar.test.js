import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readoutView } from '../js/panels/images.js';

const layer = {
  id: 'a',
  name: 'coracao-pixel.png',
  imageId: 'img-a',
  naturalWidth: 480,
  naturalHeight: 480,
  cx: 0,
  cy: 0,
  width: 54.9,
  rotation: -8,
  crop: { x: 0, y: 0, width: 1, height: 1 },
};

test('readoutView: negative rotation with the minus sign and the width in mm', () => {
  assert.deepEqual(readoutView(layer), { rotation: '−8°', width: '54,9 mm' });
});

test('readoutView: zero rotation and a whole width with one decimal', () => {
  assert.deepEqual(readoutView({ ...layer, rotation: 0, width: 120 }), { rotation: '0°', width: '120,0 mm' });
});

test('readoutView: no layer', () => {
  assert.equal(readoutView(null), null);
});

test('panel-images.css: board spacing from tokens, actions row wraps', () => {
  const css = readFileSync(new URL('../css/panel-images.css', import.meta.url), 'utf8');
  assert.match(css, /\.panel-images \{[^}]*gap: var\(--space-20\);[^}]*padding: var\(--space-20\);/);
  assert.match(css, /\.layer-card \{[^}]*padding: var\(--space-12\);/);
  assert.match(css, /\.layer-card__actions \{[^}]*flex-wrap: wrap;/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,6}\b/);
});
