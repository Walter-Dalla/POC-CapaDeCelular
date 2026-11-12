import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyShortcut, orphanIds } from '../js/controls.js';

const press = (key, mods = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  targetIsText: false,
  ...mods,
});

test('Ctrl+Z and Cmd+Z undo', () => {
  assert.equal(historyShortcut(press('z', { ctrlKey: true })), 'undo');
  assert.equal(historyShortcut(press('z', { metaKey: true })), 'undo');
});

test('Ctrl+Shift+Z and Cmd+Shift+Z redo, whatever the case of the key', () => {
  assert.equal(historyShortcut(press('Z', { ctrlKey: true, shiftKey: true })), 'redo');
  assert.equal(historyShortcut(press('Z', { metaKey: true, shiftKey: true })), 'redo');
  assert.equal(historyShortcut(press('z', { ctrlKey: true, shiftKey: true })), 'redo');
});

test('Ctrl+Z with caps lock (key Z, no shift) still undoes', () => {
  assert.equal(historyShortcut(press('Z', { ctrlKey: true })), 'undo');
});

test('Ctrl+Y redoes', () => {
  assert.equal(historyShortcut(press('y', { ctrlKey: true })), 'redo');
});

test('keys without Ctrl or Cmd do nothing', () => {
  assert.equal(historyShortcut(press('z')), null);
  assert.equal(historyShortcut(press('Z', { shiftKey: true })), null);
  assert.equal(historyShortcut(press('y')), null);
  assert.equal(historyShortcut(press('x', { ctrlKey: true })), null);
});

test('a text field keeps its own undo', () => {
  assert.equal(historyShortcut(press('z', { ctrlKey: true, targetIsText: true })), null);
  assert.equal(historyShortcut(press('Z', { metaKey: true, shiftKey: true, targetIsText: true })), null);
  assert.equal(historyShortcut(press('y', { ctrlKey: true, targetIsText: true })), null);
});

test('orphanIds with nothing seen is empty', () => {
  assert.deepEqual(orphanIds(new Set(), new Set(['img1'])), []);
});

test('orphanIds with every seen id still referenced is empty', () => {
  assert.deepEqual(orphanIds(new Set(['img1', 'img2']), new Set(['img1', 'img2'])), []);
});

test('orphanIds lists a seen id that is no longer referenced', () => {
  assert.deepEqual(orphanIds(new Set(['img1', 'img2']), new Set(['img2'])), ['img1']);
});

test('an id referenced but never seen is not an orphan', () => {
  assert.deepEqual(orphanIds(new Set(['img1']), new Set(['img1', 'img9'])), []);
});
