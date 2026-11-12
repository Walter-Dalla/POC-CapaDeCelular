import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHistory,
  record,
  undo,
  redo,
  canUndo,
  canRedo,
  snapshots,
} from '../js/history.js';

const a = { n: 'a' };
const b = { n: 'b' };
const c = { n: 'c' };
const d = { n: 'd' };

test('createHistory starts empty', () => {
  assert.deepEqual(createHistory(a), { past: [], present: a, future: [], lastKey: null, lastAt: 0 });
});

test('undo and redo round trip', () => {
  let h = createHistory(a);
  h = record(h, b, { now: 1000 });
  h = record(h, c, { now: 2000 });
  assert.equal(canUndo(h), true);
  assert.equal(canRedo(h), false);
  h = undo(h);
  assert.equal(h.present, b);
  h = undo(h);
  assert.equal(h.present, a);
  assert.equal(canUndo(h), false);
  assert.equal(canRedo(h), true);
  h = redo(h);
  assert.equal(h.present, b);
  h = redo(h);
  assert.equal(h.present, c);
  assert.equal(canRedo(h), false);
  assert.deepEqual(h.past, [a, b]);
});

test('undo and redo at the ends return the same history', () => {
  const h = createHistory(a);
  assert.equal(undo(h), h);
  assert.equal(redo(h), h);
});

test('record does not change the history it receives', () => {
  const h = createHistory(a);
  const next = record(h, b, { now: 1 });
  assert.deepEqual(h, { past: [], present: a, future: [], lastKey: null, lastAt: 0 });
  assert.notEqual(next, h);
});

test('a new record after undo empties future', () => {
  let h = createHistory(a);
  h = record(h, b, { now: 1000 });
  h = undo(h);
  assert.equal(canRedo(h), true);
  h = record(h, c, { now: 3000 });
  assert.deepEqual(h.future, []);
  assert.deepEqual(h.past, [a]);
  assert.equal(h.present, c);
});

test('101 records leave 100 in past, the oldest leaves', () => {
  const items = Array.from({ length: 102 }, (_, i) => ({ i }));
  let h = createHistory(items[0]);
  for (let i = 1; i <= 101; i++) h = record(h, items[i], { now: i * 1000 });
  assert.equal(h.past.length, 100);
  assert.equal(h.past[0], items[1]);
  assert.equal(h.past[99], items[100]);
  assert.equal(h.present, items[101]);
});

test('same key at 499 ms merges into one step', () => {
  let h = createHistory(a);
  h = record(h, b, { key: 'drag', now: 1000 });
  h = record(h, c, { key: 'drag', now: 1499 });
  assert.deepEqual(h.past, [a]);
  assert.equal(h.present, c);
  h = undo(h);
  assert.equal(h.present, a);
});

test('same key at 500 ms does not merge', () => {
  let h = createHistory(a);
  h = record(h, b, { key: 'drag', now: 1000 });
  h = record(h, c, { key: 'drag', now: 1500 });
  assert.deepEqual(h.past, [a, b]);
  assert.equal(h.present, c);
});

test('a different key does not merge', () => {
  let h = createHistory(a);
  h = record(h, b, { key: 'drag', now: 1000 });
  h = record(h, c, { key: 'rotate', now: 1100 });
  assert.deepEqual(h.past, [a, b]);
});

test('a null key never merges', () => {
  let h = createHistory(a);
  h = record(h, b, { key: null, now: 1000 });
  h = record(h, c, { key: null, now: 1001 });
  h = record(h, d, { now: 1002 });
  assert.deepEqual(h.past, [a, b, c]);
  assert.equal(h.present, d);
});

test('a record right after undo does not merge with the step before it', () => {
  let h = createHistory(a);
  h = record(h, b, { key: 'drag', now: 1000 });
  h = undo(h);
  h = record(h, c, { key: 'drag', now: 1100 });
  assert.deepEqual(h.past, [a]);
  assert.equal(h.present, c);
});

test('an unchanged snapshot records nothing', () => {
  let h = createHistory(a);
  h = record(h, b, { now: 1000 });
  assert.equal(record(h, b, { now: 5000 }), h);
});

test('snapshots lists past, present and future', () => {
  let h = createHistory(a);
  h = record(h, b, { now: 1000 });
  h = record(h, c, { now: 2000 });
  h = undo(h);
  assert.deepEqual(snapshots(h), [a, b, c]);
});
