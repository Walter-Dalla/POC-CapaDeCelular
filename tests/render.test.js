import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawLayers, drawComposition } from '../js/render.js';

// Fake 2D context: every method call and every property set is recorded in
// order, as { op, args } and { set, value }.
function recorder() {
  const ops = [];
  const props = {};
  const ctx = new Proxy(props, {
    get(target, name) {
      if (name in target) return target[name];
      return (...args) => ops.push({ op: name, args });
    },
    set(target, name, value) {
      target[name] = value;
      ops.push({ set: name, value });
      return true;
    },
  });
  return { ctx, ops };
}

const PATH_OPS = new Set(['moveTo', 'lineTo', 'arcTo', 'arc', 'closePath']);

// Sequence of operation names, with path segments collapsed into one 'path'.
function sequence(ops) {
  const out = [];
  for (const o of ops) {
    const name = o.op ?? `${o.set}=${o.value}`;
    if (PATH_OPS.has(o.op)) {
      if (out.at(-1) !== 'path') out.push('path');
    } else {
      out.push(name);
    }
  }
  return out;
}

const bitmap = { kind: 'bitmap' };
const bitmaps = { img1: bitmap };
const getBitmap = (id) => bitmaps[id];

const layer = {
  id: 'l1',
  name: 'foto',
  imageId: 'img1',
  naturalWidth: 400,
  naturalHeight: 400,
  cx: 10,
  cy: 0,
  width: 40,
  rotation: 0,
  crop: { x: 0.5, y: 0, width: 0.5, height: 1 },
};

const model = {
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
};

function options(overrides = {}) {
  return {
    model,
    layers: [layer],
    background: '#FFFFFF',
    getBitmap,
    scale: 2,
    bleedMm: 2,
    clip: 'rect',
    cameraHole: false,
    mirror: false,
    ...overrides,
  };
}

test('drawLayers: source from the crop, destination from the layer size', () => {
  const { ctx, ops } = recorder();
  drawLayers(ctx, [layer], getBitmap, 2);
  assert.deepEqual(ops, [
    { op: 'save', args: [] },
    { op: 'translate', args: [20, 0] },
    { op: 'rotate', args: [0] },
    { op: 'drawImage', args: [bitmap, 200, 0, 200, 400, -40, -80, 80, 160] },
    { op: 'restore', args: [] },
  ]);
});

test('drawLayers: rotation in radians, clockwise', () => {
  const { ctx, ops } = recorder();
  drawLayers(ctx, [{ ...layer, rotation: 90 }], getBitmap, 1);
  const rotate = ops.find((o) => o.op === 'rotate');
  assert.ok(Math.abs(rotate.args[0] - Math.PI / 2) < 1e-12);
});

test('drawLayers: bottom first, a layer without bitmap draws nothing', () => {
  const { ctx, ops } = recorder();
  const missing = { ...layer, id: 'l0', imageId: 'nope' };
  const top = { ...layer, id: 'l2', cx: -5 };
  drawLayers(ctx, [missing, layer, top], getBitmap, 1);
  const translates = ops.filter((o) => o.op === 'translate').map((o) => o.args);
  assert.deepEqual(translates, [[10, 0], [-5, 0]]);
  assert.equal(ops.filter((o) => o.op === 'drawImage').length, 2);
});

test('drawLayers: only a layer without bitmap makes no call', () => {
  const { ctx, ops } = recorder();
  drawLayers(ctx, [{ ...layer, imageId: 'nope' }], getBitmap, 1);
  assert.deepEqual(ops, []);
});

test('drawComposition with rect clip, no mirror, no camera hole', () => {
  const { ctx, ops } = recorder();
  drawComposition(ctx, options());
  assert.deepEqual(sequence(ops), [
    'save',
    'imageSmoothingEnabled=true',
    'imageSmoothingQuality=high',
    'translate',
    'fillStyle=#FFFFFF',
    'fillRect',
    'save',
    'translate',
    'rotate',
    'drawImage',
    'restore',
    'restore',
  ]);
  const translate = ops.find((o) => o.op === 'translate');
  assert.ok(Math.abs(translate.args[0] - 75.6) < 1e-9);
  assert.ok(Math.abs(translate.args[1] - 151.6) < 1e-9);
  const fillRect = ops.find((o) => o.op === 'fillRect');
  const expected = [-75.6, -151.6, 151.2, 303.2];
  fillRect.args.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-9));
  assert.equal(ops.some((o) => o.op === 'clip'), false);
  assert.equal(ops.some((o) => o.value === 'destination-out'), false);
});

test('drawComposition with contour clip clips before the background', () => {
  const { ctx, ops } = recorder();
  drawComposition(ctx, options({ clip: 'contour' }));
  assert.deepEqual(sequence(ops), [
    'save',
    'imageSmoothingEnabled=true',
    'imageSmoothingQuality=high',
    'translate',
    'beginPath',
    'path',
    'clip',
    'fillStyle=#FFFFFF',
    'fillRect',
    'save',
    'translate',
    'rotate',
    'drawImage',
    'restore',
    'restore',
  ]);
  const xs = ops.filter((o) => o.op === 'moveTo' || o.op === 'lineTo').map((o) => o.args[0]);
  assert.ok(Math.abs(Math.min(...xs) + 75.6) < 1e-9);
  assert.ok(Math.abs(Math.max(...xs) - 75.6) < 1e-9);
});

test('drawComposition mirrors around the canvas centre before centring', () => {
  const { ctx, ops } = recorder();
  drawComposition(ctx, options({ mirror: true }));
  const seq = sequence(ops);
  assert.deepEqual(seq.slice(0, 7), [
    'save',
    'imageSmoothingEnabled=true',
    'imageSmoothingQuality=high',
    'translate',
    'scale',
    'translate',
    'fillStyle=#FFFFFF',
  ]);
  const transforms = ops.filter((o) => o.op === 'translate' || o.op === 'scale');
  assert.ok(Math.abs(transforms[0].args[0] - 151.2) < 1e-9);
  assert.equal(transforms[0].args[1], 0);
  assert.deepEqual(transforms[1].args, [-1, 1]);
});

test('drawComposition with camera hole erases the cutouts after the layers', () => {
  const { ctx, ops } = recorder();
  drawComposition(ctx, options({ cameraHole: true }));
  const seq = sequence(ops);
  assert.deepEqual(seq.slice(-8), [
    'drawImage',
    'restore',
    'globalCompositeOperation=destination-out',
    'fillStyle=#000',
    'beginPath',
    'path',
    'fill',
    'restore',
  ]);
  const xs = ops.filter((o) => o.op === 'moveTo' || o.op === 'lineTo').map((o) => o.args[0]);
  assert.ok(Math.abs(Math.min(...xs) + 63.6) < 1e-9);
  assert.ok(Math.abs(Math.max(...xs) - 4.4) < 1e-9);
});

test('drawComposition draws only the background when no bitmap is available', () => {
  const { ctx, ops } = recorder();
  drawComposition(ctx, options({ getBitmap: () => undefined }));
  assert.equal(ops.some((o) => o.op === 'drawImage'), false);
  assert.equal(ops.some((o) => o.op === 'fillRect'), true);
});
