import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerListView, duplicateResult } from '../js/panels/images.js';

const FULL = { x: 0, y: 0, width: 1, height: 1 };

const background = {
  id: 'a',
  name: 'fundo-xadrez.jpg',
  imageId: 'img-a',
  naturalWidth: 400,
  naturalHeight: 733,
  cx: 0,
  cy: 0,
  width: 86.1,
  rotation: 0,
  crop: FULL,
};

const heart = {
  id: 'b',
  name: 'coracao-pixel.png',
  imageId: 'img-b',
  naturalWidth: 480,
  naturalHeight: 480,
  cx: 10,
  cy: 20,
  width: 54.9,
  rotation: -8,
  crop: FULL,
};

const ui = { selectedLayerId: 'b', cropLayerId: null };

test('two layers: count text and cards top first, details whole', () => {
  const view = layerListView({ layers: [background, heart] }, ui);
  assert.deepEqual(view, {
    count: '2 imagens · a de cima fica na frente',
    cards: [
      { id: 'b', name: 'coracao-pixel.png', detail: '480 × 480 px · 222 DPI na capa', selected: true, lowRes: false },
      { id: 'a', name: 'fundo-xadrez.jpg', detail: '400 × 733 px · 118 DPI na capa', selected: false, lowRes: true },
    ],
  });
});

test('one layer: singular count', () => {
  const view = layerListView({ layers: [heart] }, { selectedLayerId: null, cropLayerId: null });
  assert.equal(view.count, '1 imagem · a de cima fica na frente');
  assert.equal(view.cards.length, 1);
  assert.equal(view.cards[0].selected, false);
});

test('no layers: null count and no cards', () => {
  assert.deepEqual(layerListView({ layers: [] }, ui), { count: null, cards: [] });
});

test('half-width crop of a 480 px image: cropped pixel size and its resolution', () => {
  const cropped = { ...heart, crop: { x: 0.25, y: 0, width: 0.5, height: 1 } };
  const view = layerListView({ layers: [cropped] }, ui);
  assert.deepEqual(view.cards[0], {
    id: 'b',
    name: 'coracao-pixel.png',
    detail: '240 × 480 px · 111 DPI na capa',
    selected: true,
    lowRes: true,
  });
});

test('duplicateResult: a known layer selects the copy, placed above it', () => {
  const project = { layers: [background, heart] };
  const result = duplicateResult(project, 'a', 'copy', { halfWidth: 37.8, halfHeight: 75.8 });
  assert.equal(result.selectedLayerId, 'copy');
  assert.deepEqual(result.project.layers.map((layer) => layer.id), ['a', 'copy', 'b']);
});

test('duplicateResult: an unknown id keeps the project and selects nothing', () => {
  const project = { layers: [background, heart] };
  const result = duplicateResult(project, 'gone', 'copy', { halfWidth: 37.8, halfHeight: 75.8 });
  assert.equal(result.project, project);
  assert.equal(result.selectedLayerId, null);
});
