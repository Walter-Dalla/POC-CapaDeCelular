import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotateFromHandle, scaleFromHandle } from '../js/gestures.js';

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);
}

test('scaleFromHandle: pointer twice as far from the centre doubles the width', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 0, x: 20, y: 10 };
  near(scaleFromHandle(start, { x: 40, y: 20 }), 80);
});

test('scaleFromHandle: pointer half as far halves the width', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 0, x: 20, y: 10 };
  near(scaleFromHandle(start, { x: 10, y: 5 }), 20);
});

test('scaleFromHandle: measured from the layer centre, not the origin', () => {
  const start = { cx: 10, cy: 10, width: 30, rotation: 0, x: 20, y: 10 };
  near(scaleFromHandle(start, { x: 10, y: 40 }), 90);
});

test('rotateFromHandle: a quarter turn clockwise adds 90', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 0, x: 0, y: -30 };
  near(rotateFromHandle(start, { x: 30, y: 0 }, false), 90);
});

test('rotateFromHandle: start −8 swept +30 gives 22, with snap 15', () => {
  // Grab point straight right of the centre; the pointer 30° clockwise from it.
  const start = { cx: 0, cy: 0, width: 40, rotation: -8, x: 2, y: 0 };
  const pointer = { x: Math.sqrt(3), y: 1 };
  near(rotateFromHandle(start, pointer, false), 22);
  assert.equal(rotateFromHandle(start, pointer, true), 15);
});

test('rotateFromHandle: the result stays within (−180, 180]', () => {
  const start = { cx: 0, cy: 0, width: 40, rotation: 170, x: 0, y: -30 };
  near(rotateFromHandle(start, { x: 30, y: 0 }, false), -100);
});
