import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkExportLimit, exportFile, renderPlan } from '../js/export.js';
import { readPngDpi } from '../js/png-dpi.js';

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

function makeState(exportOptions = {}) {
  return {
    project: {
      modelId: 'apple-iphone-15',
      customModel: { width: 71.6, height: 147.6, cornerRadius: 12, bleed: 2 },
      layers: [],
      background: '#FFFFFF',
    },
    exportOptions: { ...defaultOptions, ...exportOptions },
    orderId: '',
    ui: { tab: 'export', selectedLayerId: null, cropLayerId: null, cropDraft: null, showSafeMargin: true, guides: { v: false, h: false } },
  };
}

const LIMIT = 'Arquivo grande demais para este navegador. Escolha um DPI menor.';

test('checkExportLimit: the default file fits', () => {
  assert.equal(checkExportLimit(893, 1791), null);
});

test('checkExportLimit: a side over 8192 px or an area over 16 777 216 px', () => {
  assert.equal(checkExportLimit(8193, 100), LIMIT);
  assert.equal(checkExportLimit(5000, 4000), LIMIT);
  assert.equal(checkExportLimit(8192, 2048), null);
});

test('renderPlan for the defaults', () => {
  const plan = renderPlan(makeState(), iphone15);
  assert.equal(plan.widthPx, 893);
  assert.equal(plan.heightPx, 1791);
  assert.ok(Math.abs(plan.scale - 11.811) < 0.001, `scale ${plan.scale}`);
  assert.equal(plan.bleedMm, 2);
  assert.equal(plan.clip, 'rect');
  assert.equal(plan.cameraHole, false);
  assert.equal(plan.mirror, false);
  assert.equal(plan.mime, 'image/png');
  assert.equal(plan.quality, undefined);
  assert.equal(plan.dpi, 300);
  assert.equal(plan.fileName, 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
});

test('renderPlan for JPEG: jpeg mime and quality 0.95', () => {
  const plan = renderPlan(makeState({ format: 'jpeg' }), iphone15);
  assert.equal(plan.mime, 'image/jpeg');
  assert.equal(plan.quality, 0.95);
  assert.equal(plan.fileName, 'capa-apple-iphone-15-75.6x151.6mm-300dpi.jpg');
});

test('renderPlan with the bleed off', () => {
  const plan = renderPlan(makeState({ bleedOn: false }), iphone15);
  assert.equal(plan.widthPx, 846);
  assert.equal(plan.heightPx, 1743);
  assert.equal(plan.bleedMm, 0);
});

test('renderPlan passes the contour cut, the camera hole and the mirror for PNG', () => {
  const plan = renderPlan(makeState({ clip: 'contour', cameraHole: true, mirror: true }), iphone15);
  assert.equal(plan.clip, 'contour');
  assert.equal(plan.cameraHole, true);
  assert.equal(plan.mirror, true);
});

// Smallest PNG the metadata step accepts: signature, a 1 × 1 IHDR and IEND (CRCs left at zero).
const tinyPng = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
]);

// A document whose canvas records its size and hands back the tiny PNG.
function fakeDocument(record) {
  const context = new Proxy(
    {},
    {
      get: (target, key) => (key in target ? target[key] : () => {}),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  return {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => context,
        toBlob(done, mime, quality) {
          record.push({ width: canvas.width, height: canvas.height, mime, quality });
          done(new Blob([tinyPng], { type: mime }));
        },
      };
      return canvas;
    },
  };
}

test('exportFile renders at the plan size and writes 300 DPI into the PNG', async () => {
  const record = [];
  const previous = globalThis.document;
  globalThis.document = fakeDocument(record);
  try {
    const { blob, fileName } = await exportFile(makeState(), iphone15, () => null);
    assert.equal(fileName, 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
    assert.equal(blob.type, 'image/png');
    assert.deepEqual(record, [{ width: 893, height: 1791, mime: 'image/png', quality: undefined }]);
    assert.equal(readPngDpi(new Uint8Array(await blob.arrayBuffer())), 300);
  } finally {
    globalThis.document = previous;
  }
});

test('exportFile throws the limit message before making a canvas', async () => {
  const record = [];
  const previous = globalThis.document;
  globalThis.document = fakeDocument(record);
  try {
    await assert.rejects(exportFile(makeState({ dpi: 2400 }), iphone15, () => null), { message: LIMIT });
    assert.deepEqual(record, []);
  } finally {
    globalThis.document = previous;
  }
});
