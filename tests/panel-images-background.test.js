import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACKGROUNDS, backgroundView } from '../js/panels/images.js';

test('BACKGROUNDS: the five colours in order', () => {
  assert.deepEqual(BACKGROUNDS, [
    { label: 'Branco', color: '#FFFFFF' },
    { label: 'Preto', color: '#111111' },
    { label: 'Verde Leonel', color: '#24564C' },
    { label: 'Roxo', color: '#6B2FA0' },
    { label: 'Amarelo', color: '#FFC531' },
  ]);
});

test('default white: white pressed with the selected label, not custom', () => {
  assert.deepEqual(backgroundView('#FFFFFF'), {
    swatches: [
      { label: 'Branco', color: '#FFFFFF', pressed: true, ariaLabel: 'Branco, selecionado' },
      { label: 'Preto', color: '#111111', pressed: false, ariaLabel: 'Preto' },
      { label: 'Verde Leonel', color: '#24564C', pressed: false, ariaLabel: 'Verde Leonel' },
      { label: 'Roxo', color: '#6B2FA0', pressed: false, ariaLabel: 'Roxo' },
      { label: 'Amarelo', color: '#FFC531', pressed: false, ariaLabel: 'Amarelo' },
    ],
    custom: false,
  });
});

test('#24564C: only "Verde Leonel" pressed', () => {
  const view = backgroundView('#24564C');
  assert.deepEqual(
    view.swatches.filter((swatch) => swatch.pressed).map((swatch) => swatch.ariaLabel),
    ['Verde Leonel, selecionado'],
  );
  assert.equal(view.custom, false);
});

test('#123456: none pressed, custom', () => {
  const view = backgroundView('#123456');
  assert.deepEqual(
    view.swatches.map((swatch) => swatch.pressed),
    [false, false, false, false, false],
  );
  assert.equal(view.custom, true);
});

test('lower-case #ffffff matches white', () => {
  const view = backgroundView('#ffffff');
  assert.equal(view.swatches[0].pressed, true);
  assert.equal(view.swatches[0].ariaLabel, 'Branco, selecionado');
  assert.equal(view.custom, false);
});
