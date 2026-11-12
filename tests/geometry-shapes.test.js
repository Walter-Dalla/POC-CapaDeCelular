import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  traceRoundRect,
  traceCase,
  traceCutouts,
  toLocal,
  pointInRotatedRect,
  rectCorners,
  selectionHandles,
  snapToZero,
} from '../js/geometry.js';

function recorder() {
  const calls = [];
  const ctx = {};
  for (const name of ['moveTo', 'lineTo', 'arcTo', 'arc', 'closePath', 'rect', 'roundRect', 'ellipse', 'bezierCurveTo', 'quadraticCurveTo']) {
    ctx[name] = (...args) => calls.push({ name, args });
  }
  return { ctx, calls };
}

// Every point the path visits; an arc contributes its bounding box.
function points(calls) {
  const out = [];
  for (const { name, args } of calls) {
    if (name === 'moveTo' || name === 'lineTo') out.push([args[0], args[1]]);
    if (name === 'arcTo') out.push([args[0], args[1]], [args[2], args[3]]);
    if (name === 'arc') {
      const [cx, cy, r] = args;
      out.push([cx - r, cy - r], [cx + r, cy + r]);
    }
  }
  return out;
}

function bbox(calls) {
  const pts = points(calls);
  return {
    minX: Math.min(...pts.map((p) => p[0])),
    maxX: Math.max(...pts.map((p) => p[0])),
    minY: Math.min(...pts.map((p) => p[1])),
    maxY: Math.max(...pts.map((p) => p[1])),
  };
}

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
}

function nearBox(box, minX, maxX, minY, maxY) {
  near(box.minX, minX);
  near(box.maxX, maxX);
  near(box.minY, minY);
  near(box.maxY, maxY);
}

const model = {
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
};

test('traceRoundRect uses only path primitives of a rounded rectangle', () => {
  const { ctx, calls } = recorder();
  traceRoundRect(ctx, 0, 0, 10, 20, 3);
  const names = new Set(calls.map((c) => c.name));
  assert.deepEqual([...names].sort(), ['arcTo', 'closePath', 'lineTo', 'moveTo']);
  assert.equal(calls.at(-1).name, 'closePath');
  nearBox(bbox(calls), 0, 10, 0, 20);
});

test('traceRoundRect clamps the radius to half the shorter side', () => {
  const { ctx, calls } = recorder();
  traceRoundRect(ctx, 0, 0, 10, 20, 50);
  for (const call of calls.filter((c) => c.name === 'arcTo')) assert.equal(call.args[4], 5);
  assert.deepEqual(calls[0], { name: 'moveTo', args: [5, 0] });
});

test('traceCase grown by 2 at scale 1 spans the case plus the bleed, centred', () => {
  const { ctx, calls } = recorder();
  traceCase(ctx, model, 2, 1);
  nearBox(bbox(calls), -37.8, 37.8, -75.8, 75.8);
  for (const call of calls.filter((c) => c.name === 'arcTo')) near(call.args[4], 14);
});

test('traceCase multiplies by the scale', () => {
  const { ctx, calls } = recorder();
  traceCase(ctx, model, 0, 2);
  nearBox(bbox(calls), -71.6, 71.6, -147.6, 147.6);
});

test('traceCutouts moves a roundRect cutout to the centre origin', () => {
  const { ctx, calls } = recorder();
  traceCutouts(ctx, model, 1);
  nearBox(bbox(calls), -31.8, 2.2, -69.8, -35.8);
  for (const call of calls.filter((c) => c.name === 'arcTo')) near(call.args[4], 9);
});

test('traceCutouts traces a circle cutout', () => {
  const { ctx, calls } = recorder();
  const circleModel = { ...model, cutouts: [{ shape: 'circle', cx: 10, cy: 20, r: 5 }] };
  traceCutouts(ctx, circleModel, 2);
  const arc = calls.find((c) => c.name === 'arc');
  near(arc.args[0], -51.6);
  near(arc.args[1], -107.6);
  assert.equal(arc.args[2], 10);
  nearBox(bbox(calls), -61.6, -41.6, -117.6, -97.6);
});

test('traceCutouts with no cutouts adds nothing', () => {
  const { ctx, calls } = recorder();
  traceCutouts(ctx, { ...model, cutouts: [] }, 1);
  assert.equal(calls.length, 0);
});

const rotated = { cx: 10, cy: 0, width: 40, height: 20, rotation: 90 };

test('pointInRotatedRect for a 40 × 20 rect at (10, 0) rotated 90°', () => {
  assert.equal(pointInRotatedRect(10, 15, rotated), true);
  assert.equal(pointInRotatedRect(25, 0, rotated), false);
  assert.equal(pointInRotatedRect(10, 0, rotated), true);
});

test('toLocal returns the point in the unrotated frame', () => {
  const local = toLocal(10, 15, rotated);
  near(local.x, 15);
  near(local.y, 0);
});

test('rectCorners of the rotated rect', () => {
  const [nw, ne, se, sw] = rectCorners(rotated);
  near(nw.x, 20); near(nw.y, -20);
  near(ne.x, 20); near(ne.y, 20);
  near(se.x, 0); near(se.y, 20);
  near(sw.x, 0); near(sw.y, -20);
});

test('selectionHandles of an unrotated 40 × 20 rect at 4 px/mm', () => {
  const rect = { cx: 0, cy: 0, width: 40, height: 20, rotation: 0 };
  const handles = selectionHandles(rect, 4);
  near(handles.nw.x, -20); near(handles.nw.y, -10);
  near(handles.ne.x, 20); near(handles.ne.y, -10);
  near(handles.se.x, 20); near(handles.se.y, 10);
  near(handles.sw.x, -20); near(handles.sw.y, 10);
  near(handles.rotate.x, 0); near(handles.rotate.y, -22.5);
});

test('snapToZero inside and outside the threshold', () => {
  assert.equal(snapToZero(0.4, 0.5), 0);
  assert.equal(snapToZero(-0.5, 0.5), 0);
  assert.equal(snapToZero(0.6, 0.5), 0.6);
  assert.equal(snapToZero(-3, 0.5), -3);
});
