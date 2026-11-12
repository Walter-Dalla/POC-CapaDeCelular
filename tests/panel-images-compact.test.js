import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compactHint, compactDetail } from '../js/panels/images.js';

test('compactHint: without layers', () => {
  assert.equal(compactHint(0), 'Adicione uma imagem para começar.');
});

test('compactHint: with layers', () => {
  assert.equal(compactHint(2), 'Toque em uma imagem na capa para editar.');
});

test('compactDetail: resolution of the layer on the cover', () => {
  const layer = {
    id: 'a',
    name: 'coracao-pixel.png',
    imageId: 'img-a',
    naturalWidth: 480,
    naturalHeight: 480,
    cx: 0,
    cy: 0,
    width: 54.9,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
  assert.equal(compactDetail(layer), '222 DPI na capa');
});

test('panel-images.css hides .panel__compact from 900px up', () => {
  const css = readFileSync(new URL('../css/panel-images.css', import.meta.url), 'utf8');
  const media = /@media \(min-width: 900px\) \{([\s\S]*?)\n\}/.exec(css);
  assert.ok(media, 'no @media (min-width: 900px) block');
  assert.match(media[1], /\.panel__compact \{\s*display: none;\s*\}/);
});
