import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMm,
  formatSize,
  parseMm,
  plural,
  formatDegrees,
  formatDpi,
  formatPx,
} from '../js/format.js';

test('formatMm: one fixed decimal with a comma', () => {
  assert.equal(formatMm(71.6), '71,6');
  assert.equal(formatMm(147), '147,0');
  assert.equal(formatMm(71.64), '71,6');
  assert.equal(formatMm(0), '0,0');
  assert.equal(formatMm(-0.01), '0,0');
  assert.equal(formatMm(-2.5), '-2,5');
});

test('formatSize', () => {
  assert.equal(formatSize(71.6, 147.6), '71,6 × 147,6 mm');
  assert.equal(formatSize(71.6, 147.6), '71,6 × 147,6 mm');
});

test('parseMm accepts comma, dot, suffix and spaces', () => {
  assert.equal(parseMm('71,6'), 71.6);
  assert.equal(parseMm('71.6'), 71.6);
  assert.equal(parseMm(' 2 mm '), 2);
  assert.equal(parseMm('2mm'), 2);
  assert.equal(parseMm('12'), 12);
});

test('parseMm returns numbers for zero and negatives', () => {
  assert.equal(parseMm('0'), 0);
  assert.equal(parseMm('-3'), -3);
  assert.equal(parseMm('-1,5'), -1.5);
});

test('parseMm returns null for text that is not a finite number', () => {
  for (const text of ['', '   ', 'abc', '1e999', 'Infinity', 'NaN', '1,2,3', '--1', '1 cm']) {
    assert.equal(parseMm(text), null, `parseMm(${JSON.stringify(text)})`);
  }
  assert.equal(parseMm(null), null);
  assert.equal(parseMm(undefined), null);
});

test('plural', () => {
  assert.equal(plural(1, 'imagem', 'imagens'), '1 imagem');
  assert.equal(plural(2, 'imagem', 'imagens'), '2 imagens');
  assert.equal(plural(0, 'imagem', 'imagens'), '0 imagens');
});

test('formatDegrees uses U+2212 for negatives', () => {
  assert.equal(formatDegrees(-8), '−8°');
  assert.equal(formatDegrees(-8), '−8°');
  assert.equal(formatDegrees(0), '0°');
  assert.equal(formatDegrees(-0.2), '0°');
  assert.equal(formatDegrees(45), '45°');
});

test('formatDpi rounds', () => {
  assert.equal(formatDpi(222.08), '222 DPI na capa');
  assert.equal(formatDpi(299.6), '300 DPI na capa');
});

test('formatPx', () => {
  assert.equal(formatPx(893, 1791), '893 × 1791 px');
});
