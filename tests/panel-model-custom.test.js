import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customFormResult, customFieldText } from '../js/panels/model.js';

const valid = { width: '71,6', height: '147,6', cornerRadius: '12', bleed: '2' };

test('height 0: error only on height', () => {
  const result = customFormResult({ width: '71,6', height: '0', cornerRadius: '12', bleed: '2 mm' });
  assert.deepEqual(result.errors, { height: 'Informe um valor maior que zero.' });
});

test('text that is not a number and an empty field: the same message', () => {
  assert.deepEqual(customFormResult({ ...valid, height: 'abc' }).errors, {
    height: 'Informe um valor maior que zero.',
  });
  assert.deepEqual(customFormResult({ ...valid, height: '' }).errors, {
    height: 'Informe um valor maior que zero.',
  });
});

test('width 600: above the 500 mm limit', () => {
  assert.deepEqual(customFormResult({ ...valid, width: '600' }).errors, {
    width: 'Informe um valor de até 500 mm.',
  });
});

test('radius 40 on 71.6 × 147.6: more than half the shorter side', () => {
  assert.deepEqual(customFormResult({ ...valid, cornerRadius: '40' }).errors, {
    cornerRadius: 'O raio não pode passar da metade do lado menor.',
  });
});

test('all valid: no errors and the numbers', () => {
  assert.deepEqual(customFormResult({ width: '71,6', height: '147.6', cornerRadius: '12', bleed: '2 mm' }), {
    values: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
    errors: {},
  });
});

test('customFieldText: comma, no forced decimal', () => {
  assert.equal(customFieldText(12), '12');
  assert.equal(customFieldText(71.6), '71,6');
  assert.equal(customFieldText(2), '2');
  assert.equal(customFieldText(147.6), '147,6');
});
