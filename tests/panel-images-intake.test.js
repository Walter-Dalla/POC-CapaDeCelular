import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitFiles, rejectionNotice, decodeFailureNotice } from '../js/panels/images.js';

const png = { name: 'a.png', type: 'image/png' };
const jpeg = { name: 'b.jpg', type: 'image/jpeg' };
const webp = { name: 'c.webp', type: 'image/webp' };
const gif = { name: 'd.gif', type: 'image/gif' };
const pdf = { name: 'contrato.pdf', type: 'application/pdf' };
const untyped = { name: 'sem-tipo', type: '' };

test('splitFiles: png, jpeg and webp accepted, gif, pdf and an empty type rejected, order kept', () => {
  const result = splitFiles([gif, png, pdf, jpeg, untyped, webp]);
  assert.deepEqual(result, { accepted: [png, jpeg, webp], rejected: [gif, pdf, untyped] });
  assert.equal(result.accepted[0], png);
  assert.equal(result.rejected[1], pdf);
});

test('splitFiles: empty batch', () => {
  assert.deepEqual(splitFiles([]), { accepted: [], rejected: [] });
});

test('rejectionNotice: whole notice', () => {
  assert.deepEqual(rejectionNotice('contrato.pdf'), {
    kind: 'error',
    strong: '"contrato.pdf" não é uma imagem.',
    text: 'Use PNG, JPEG ou WebP.',
  });
});

test('decodeFailureNotice: whole notice', () => {
  assert.deepEqual(decodeFailureNotice('foto.png'), {
    kind: 'error',
    strong: 'Não foi possível abrir "foto.png".',
    text: 'O arquivo pode estar corrompido.',
  });
});
