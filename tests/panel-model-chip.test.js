import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chipView } from '../js/panels/model.js';

test('chipView: catalog model', () => {
  const iphone15 = {
    id: 'apple-iphone-15',
    brand: 'Apple',
    name: 'iPhone 15',
    case: { width: 71.6, height: 147.6, cornerRadius: 12 },
    cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
    bleed: 2,
    verified: false,
  };
  assert.deepEqual(chipView(iphone15), { name: 'iPhone 15', size: '71,6 × 147,6 mm' });
});

test('chipView: custom model 80 × 160', () => {
  const custom = {
    id: 'custom',
    brand: '',
    name: 'Modelo personalizado',
    case: { width: 80, height: 160, cornerRadius: 10 },
    cutouts: [],
    bleed: 2,
    verified: false,
  };
  assert.deepEqual(chipView(custom), { name: 'Modelo personalizado', size: '80,0 × 160,0 mm' });
});
