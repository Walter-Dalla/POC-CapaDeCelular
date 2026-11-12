import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exportNotes } from '../js/panels/export.js';

test('the privacy and colour notes, whole', () => {
  assert.deepEqual(exportNotes(), {
    privacy: {
      strong: 'Suas imagens não saem deste aparelho.',
      text: 'O arquivo é gerado aqui, no seu navegador.',
    },
    colour: 'O arquivo sai em RGB (sRGB). A conversão para as cores da impressora fica com o programa de impressão.',
  });
});

const NETWORK_CALLS = ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket'];

for (const path of ['../js/panels/export.js', '../js/export.js']) {
  test(`${path.slice(3)} makes no network call`, () => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    for (const call of NETWORK_CALLS) assert.equal(source.includes(call), false, `${call} found`);
  });
}
