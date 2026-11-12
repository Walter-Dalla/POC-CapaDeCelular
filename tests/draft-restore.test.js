import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreDecision, restoreTab } from '../js/draft.js';

const LAYER = {
  id: 'l1',
  name: 'foto.jpg',
  imageId: 'img1',
  naturalWidth: 1200,
  naturalHeight: 1600,
  cx: 2,
  cy: -4,
  width: 70,
  rotation: 30,
  crop: { x: 0.1, y: 0.2, width: 0.8, height: 0.7 },
};

function record(version = 1) {
  return {
    version,
    project: {
      modelId: 'samsung-galaxy-s24',
      customModel: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
      layers: [LAYER],
      background: '#00FF00',
    },
    exportOptions: { format: 'png', dpi: 150, bleedOn: true, bleedMm: 1.5, clip: 'contour', cameraHole: true, mirror: false },
    orderId: 'loja-7',
  };
}

test('no record means nothing to restore', () => {
  assert.deepEqual(restoreDecision(null, []), { kind: 'none' });
  assert.deepEqual(restoreDecision(undefined, ['img1']), { kind: 'none' });
});

test('a version 2 record is discarded', () => {
  assert.deepEqual(restoreDecision(record(2), ['img1']), { kind: 'discard' });
});

test('a layer whose image is missing discards the record', () => {
  assert.deepEqual(restoreDecision(record(), ['img2']), { kind: 'discard' });
});

test('a valid record is restored with the parsed draft', () => {
  assert.deepEqual(restoreDecision(record(), new Set(['img1', 'img9'])), {
    kind: 'restore',
    draft: {
      project: {
        modelId: 'samsung-galaxy-s24',
        customModel: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
        layers: [
          {
            id: 'l1',
            name: 'foto.jpg',
            imageId: 'img1',
            naturalWidth: 1200,
            naturalHeight: 1600,
            cx: 2,
            cy: -4,
            width: 70,
            rotation: 30,
            crop: { x: 0.1, y: 0.2, width: 0.8, height: 0.7 },
          },
        ],
        background: '#00FF00',
      },
      exportOptions: { format: 'png', dpi: 150, bleedOn: true, bleedMm: 1.5, clip: 'contour', cameraHole: true, mirror: false },
      orderId: 'loja-7',
    },
  });
});

test('restoreTab opens Imagens when there are layers, else Modelo', () => {
  assert.equal(restoreTab({ layers: [LAYER] }), 'images');
  assert.equal(restoreTab({ layers: [] }), 'model');
});
