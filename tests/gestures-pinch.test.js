import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinchStep, wheelFactor } from '../js/gestures.js';

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not ${expected}`);
}

test('wheelFactor: no wheel movement keeps the size', () => {
  assert.equal(wheelFactor(0), 1);
});

test('wheelFactor: wheel up by 100 grows about 16%', () => {
  near(wheelFactor(-100), 1.162, 0.001);
});

test('wheelFactor: one event never grows more than 1.25 nor shrinks under 0.8', () => {
  assert.equal(wheelFactor(-10000), 1.25);
  assert.equal(wheelFactor(10000), 0.8);
});

test('pinchStep: fingers twice as far apart and turned a quarter clockwise', () => {
  const start = { a: { x: -10, y: 0 }, b: { x: 10, y: 0 } };
  const step = pinchStep(start, { x: 0, y: -20 }, { x: 0, y: 20 });
  near(step.factor, 2);
  near(step.rotation, 90);
});

test('pinchStep: fingers that do not move change nothing', () => {
  const start = { a: { x: 3, y: 4 }, b: { x: 9, y: 12 } };
  const step = pinchStep(start, { x: 3, y: 4 }, { x: 9, y: 12 });
  assert.deepEqual(step, { factor: 1, rotation: 0 });
});
