import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newId,
  createLayer,
  addLayer,
  removeLayer,
  duplicateLayer,
  raiseLayer,
  lowerLayer,
  getLayer,
  setBackground,
} from '../js/layers.js';

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function layer(id, extra = {}) {
  return {
    id,
    name: `foto ${id}`,
    imageId: `img-${id}`,
    naturalWidth: 400,
    naturalHeight: 400,
    cx: 0,
    cy: 0,
    width: 40,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
    ...extra,
  };
}

function project(...layers) {
  return deepFreeze({ modelId: 'apple-iphone-15', customModel: null, layers, background: '#FFFFFF' });
}

const ids = (p) => p.layers.map((l) => l.id);

const model = {
  id: 'apple-iphone-15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [],
  bleed: 2,
};

test('newId returns distinct non-empty strings', () => {
  const a = newId();
  const b = newId();
  assert.equal(typeof a, 'string');
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

test('newId falls back when crypto.randomUUID is missing', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true, writable: true });
  try {
    const a = newId();
    const b = newId();
    assert.equal(typeof a, 'string');
    assert.ok(a.length > 0);
    assert.notEqual(a, b);
  } finally {
    Object.defineProperty(globalThis, 'crypto', original);
  }
});

test('createLayer: full crop, centred, no rotation, filling the case plus bleed', () => {
  const l = createLayer(
    { id: 'a', name: 'foto.png', imageId: 'img', naturalWidth: 1000, naturalHeight: 500 },
    model,
    2,
  );
  assert.deepEqual(l, {
    id: 'a',
    name: 'foto.png',
    imageId: 'img',
    naturalWidth: 1000,
    naturalHeight: 500,
    cx: 0,
    cy: 0,
    width: 303.2,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  });
});

test('addLayer puts the new layer on top', () => {
  let p = project();
  p = addLayer(p, layer('a'));
  p = addLayer(p, layer('b'));
  p = addLayer(p, layer('c'));
  assert.deepEqual(ids(p), ['a', 'b', 'c']);
});

test('getLayer finds by id, null when unknown', () => {
  const p = project(layer('a'), layer('b'));
  assert.equal(getLayer(p, 'b').id, 'b');
  assert.equal(getLayer(p, 'x'), null);
});

test('removeLayer drops the layer; unknown id returns the same project', () => {
  const p = project(layer('a'), layer('b'), layer('c'));
  assert.deepEqual(ids(removeLayer(p, 'b')), ['a', 'c']);
  assert.equal(removeLayer(p, 'x'), p);
  assert.deepEqual(ids(p), ['a', 'b', 'c']);
});

test('duplicateLayer puts the copy right above, 5 mm right and down', () => {
  const p = project(layer('a', { cx: 1, cy: 2, crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 } }), layer('b'));
  const next = duplicateLayer(p, 'a', 'a2');
  assert.deepEqual(ids(next), ['a', 'a2', 'b']);
  const copy = next.layers[1];
  assert.equal(copy.name, 'foto a');
  assert.equal(copy.imageId, 'img-a');
  assert.deepEqual(copy.crop, { x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
  assert.equal(copy.cx, 6);
  assert.equal(copy.cy, 7);
  assert.equal(copy.width, 40);
  assert.deepEqual(next.layers[0], p.layers[0]);
});

test('duplicateLayer clamps the copy centre into the bounds (iPhone 15, bleed 2)', () => {
  const p = project(layer('a', { cx: 36, cy: 74 }));
  const next = duplicateLayer(p, 'a', 'a2', { halfWidth: 37.8, halfHeight: 75.8 });
  assert.equal(next.layers[1].cx, 37.8);
  assert.equal(next.layers[1].cy, 75.8);
});

test('duplicateLayer without bounds does not clamp the copy centre', () => {
  const p = project(layer('a', { cx: 36, cy: 74 }));
  const next = duplicateLayer(p, 'a', 'a2');
  assert.equal(next.layers[1].cx, 41);
  assert.equal(next.layers[1].cy, 79);
});

test('duplicateLayer with an unknown id returns the same project', () => {
  const p = project(layer('a'));
  assert.equal(duplicateLayer(p, 'x', 'y'), p);
});

test('raiseLayer and lowerLayer move one position, no-op at the ends', () => {
  const p = project(layer('a'), layer('b'), layer('c'));
  assert.deepEqual(ids(raiseLayer(p, 'a')), ['b', 'a', 'c']);
  assert.deepEqual(ids(lowerLayer(p, 'c')), ['a', 'c', 'b']);
  assert.equal(raiseLayer(p, 'c'), p);
  assert.equal(lowerLayer(p, 'a'), p);
  assert.equal(raiseLayer(p, 'x'), p);
  assert.equal(lowerLayer(p, 'x'), p);
});

test('setBackground accepts #RRGGBB upper-cased and rejects anything else', () => {
  const p = project();
  assert.equal(setBackground(p, '#a1b2c3').background, '#A1B2C3');
  assert.equal(setBackground(p, 'red'), p);
  assert.equal(setBackground(p, '#FFF'), p);
  assert.equal(setBackground(p, '#GGGGGG'), p);
  assert.equal(setBackground(p, null), p);
  assert.equal(p.background, '#FFFFFF');
});

test('the input project is never mutated (deeply frozen input)', () => {
  const p = project(layer('a'), layer('b'), layer('c'));
  const snapshot = JSON.stringify(p);
  addLayer(p, layer('d'));
  removeLayer(p, 'a');
  duplicateLayer(p, 'a', 'a2', { halfWidth: 1, halfHeight: 1 });
  raiseLayer(p, 'a');
  lowerLayer(p, 'c');
  setBackground(p, '#000000');
  assert.equal(JSON.stringify(p), snapshot);
});
