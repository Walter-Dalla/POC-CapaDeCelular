import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summaryView } from '../js/panels/export.js';

const iphone15 = {
  id: 'apple-iphone-15',
  brand: 'Apple',
  name: 'iPhone 15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
  verified: false,
};

const defaultOptions = {
  format: 'png',
  dpi: 300,
  bleedOn: true,
  bleedMm: null,
  clip: 'rect',
  cameraHole: false,
  mirror: false,
};

const full = { x: 0, y: 0, width: 1, height: 1 };

// 465 px across 100 mm: 118,1 DPI.
const checkered = {
  id: 'layer-a',
  name: 'fundo-xadrez.jpg',
  imageId: 'img-a',
  naturalWidth: 465,
  naturalHeight: 465,
  cx: 0,
  cy: 0,
  width: 100,
  rotation: 0,
  crop: full,
};
// 300 px across 100 mm: 76,2 DPI.
const logo = { ...checkered, id: 'layer-b', name: 'logo.png', imageId: 'img-b', naturalWidth: 300, naturalHeight: 300 };
// 3000 px across 50 mm: 1524 DPI.
const photo = { ...checkered, id: 'layer-c', name: 'foto.jpg', imageId: 'img-c', naturalWidth: 3000, naturalHeight: 2000, width: 50 };

function makeState({ exportOptions = {}, orderId = '', layers = [] } = {}) {
  return {
    project: {
      modelId: 'apple-iphone-15',
      customModel: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
      layers,
      background: '#FFFFFF',
    },
    exportOptions: { ...defaultOptions, ...exportOptions },
    orderId,
    ui: { tab: 'export', selectedLayerId: null, cropLayerId: null, cropDraft: null, showSafeMargin: true, guides: { v: false, h: false } },
  };
}

test('iPhone 15 with the default options', () => {
  assert.deepEqual(summaryView(makeState(), iphone15), {
    sizeMm: '75,6 × 151,6 mm',
    sizeNote: 'capa + 2 mm de sangria por lado',
    sizePx: '893 × 1791 px',
    pxNote: 'a 300 DPI · cores em RGB',
    fileName: 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png',
    warning: null,
  });
});

test('bleed off: the case alone', () => {
  const view = summaryView(makeState({ exportOptions: { bleedOn: false } }), iphone15);
  assert.equal(view.sizeMm, '71,6 × 147,6 mm');
  assert.equal(view.sizeNote, 'capa sem sangria');
  assert.equal(view.sizePx, '846 × 1743 px');
});

test('600 DPI', () => {
  const view = summaryView(makeState({ exportOptions: { dpi: 600 } }), iphone15);
  assert.equal(view.sizePx, '1786 × 3581 px');
  assert.equal(view.pxNote, 'a 600 DPI · cores em RGB');
});

test('file name with the order in front', () => {
  const view = summaryView(makeState({ orderId: '1234 João Silva' }), iphone15);
  assert.equal(view.fileName, '1234-joao-silva-capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
});

test('JPEG: the file name ends in .jpg', () => {
  const view = summaryView(makeState({ exportOptions: { format: 'jpeg' } }), iphone15);
  assert.equal(view.fileName, 'capa-apple-iphone-15-75.6x151.6mm-300dpi.jpg');
});

test('one low layer: warning about it', () => {
  const view = summaryView(makeState({ layers: [photo, checkered] }), iphone15);
  assert.deepEqual(view.warning, {
    strong: '1 imagem com baixa resolução.',
    text: '"fundo-xadrez.jpg" está a 118 DPI na capa.',
    layerId: 'layer-a',
  });
});

test('two low layers: plural, and the text names the lowest one', () => {
  const view = summaryView(makeState({ layers: [logo, photo, checkered] }), iphone15);
  assert.deepEqual(view.warning, {
    strong: '2 imagens com baixa resolução.',
    text: '"logo.png" está a 76 DPI na capa.',
    layerId: 'layer-b',
  });
});
