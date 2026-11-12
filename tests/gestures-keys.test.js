import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyAction } from '../js/gestures.js';

function press(key, extra = {}) {
  return keyAction({ key, shiftKey: false, ctrlKey: false, metaKey: false, targetIsText: false, ...extra });
}

test('keyAction: arrows move 1 mm', () => {
  assert.deepEqual(press('ArrowLeft'), { type: 'move', dx: -1, dy: 0 });
  assert.deepEqual(press('ArrowRight'), { type: 'move', dx: 1, dy: 0 });
  assert.deepEqual(press('ArrowUp'), { type: 'move', dx: 0, dy: -1 });
  assert.deepEqual(press('ArrowDown'), { type: 'move', dx: 0, dy: 1 });
});

test('keyAction: arrows with Shift move 0.1 mm', () => {
  assert.deepEqual(press('ArrowLeft', { shiftKey: true }), { type: 'move', dx: -0.1, dy: 0 });
  assert.deepEqual(press('ArrowDown', { shiftKey: true }), { type: 'move', dx: 0, dy: 0.1 });
});

test('keyAction: Delete and Backspace remove', () => {
  assert.deepEqual(press('Delete'), { type: 'remove' });
  assert.deepEqual(press('Backspace'), { type: 'remove' });
});

test('keyAction: ] raises and [ lowers', () => {
  assert.deepEqual(press(']'), { type: 'raise' });
  assert.deepEqual(press('['), { type: 'lower' });
});

test('keyAction: Escape cancels and Enter confirms', () => {
  assert.deepEqual(press('Escape'), { type: 'cancel' });
  assert.deepEqual(press('Enter'), { type: 'confirm' });
});

test('keyAction: keys typed in a text field are not the stage’s', () => {
  assert.equal(press('Delete', { targetIsText: true }), null);
  assert.equal(press('ArrowLeft', { targetIsText: true }), null);
});

test('keyAction: shortcuts with Ctrl or Meta are not the stage’s', () => {
  assert.equal(press('z', { ctrlKey: true }), null);
  assert.equal(press('ArrowLeft', { metaKey: true }), null);
});

test('keyAction: other keys do nothing', () => {
  assert.equal(press('a'), null);
  assert.equal(press(' '), null);
});
