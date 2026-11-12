import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeDraft, parseDraft } from '../js/draft.js';

function makeState() {
  return {
    project: {
      modelId: 'apple-iphone-15',
      customModel: { width: 70, height: 140, cornerRadius: 10, bleed: 2 },
      layers: [
        {
          id: 'l1',
          name: 'praia.jpg',
          imageId: 'img-a',
          naturalWidth: 4000,
          naturalHeight: 3000,
          cx: -3.5,
          cy: 12,
          width: 60,
          rotation: 0,
          crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.6 },
        },
        {
          id: 'l2',
          name: 'logo.png',
          imageId: 'img-b',
          naturalWidth: 800,
          naturalHeight: 800,
          cx: 10,
          cy: -20,
          width: 25,
          rotation: -45,
          crop: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
      background: '#1A2B3C',
    },
    exportOptions: { format: 'jpeg', dpi: 600, bleedOn: false, bleedMm: 3, clip: 'rect', cameraHole: false, mirror: true },
    orderId: 'PED-42',
    ui: {
      tab: 'images',
      selectedLayerId: 'l2',
      cropLayerId: null,
      cropDraft: null,
      showSafeMargin: true,
      guides: { v: true, h: false },
    },
  };
}

const IMAGES = new Set(['img-a', 'img-b']);

// A valid record, written out by hand, that each rejection case breaks in one place.
function validRecord() {
  return {
    version: 1,
    project: {
      modelId: 'custom',
      customModel: { width: 70, height: 140, cornerRadius: 10, bleed: 2 },
      layers: [
        {
          id: 'l1',
          name: 'a.png',
          imageId: 'img-a',
          naturalWidth: 1000,
          naturalHeight: 2000,
          cx: 0,
          cy: 0,
          width: 50,
          rotation: 90,
          crop: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
      background: '#FFFFFF',
    },
    exportOptions: { format: 'png', dpi: 300, bleedOn: true, bleedMm: null, clip: 'contour', cameraHole: true, mirror: false },
    orderId: '',
  };
}

test('round trip keeps project, export options and order id', () => {
  const state = makeState();
  const parsed = parseDraft(serializeDraft(state), IMAGES);
  assert.deepEqual(parsed, {
    project: {
      modelId: 'apple-iphone-15',
      customModel: { width: 70, height: 140, cornerRadius: 10, bleed: 2 },
      layers: [
        {
          id: 'l1',
          name: 'praia.jpg',
          imageId: 'img-a',
          naturalWidth: 4000,
          naturalHeight: 3000,
          cx: -3.5,
          cy: 12,
          width: 60,
          rotation: 0,
          crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.6 },
        },
        {
          id: 'l2',
          name: 'logo.png',
          imageId: 'img-b',
          naturalWidth: 800,
          naturalHeight: 800,
          cx: 10,
          cy: -20,
          width: 25,
          rotation: -45,
          crop: { x: 0, y: 0, width: 1, height: 1 },
        },
      ],
      background: '#1A2B3C',
    },
    exportOptions: { format: 'jpeg', dpi: 600, bleedOn: false, bleedMm: 3, clip: 'rect', cameraHole: false, mirror: true },
    orderId: 'PED-42',
  });
});

test('serializeDraft writes version 1 and has no ui and no bitmap', () => {
  const state = makeState();
  state.project.layers[0].bitmap = { width: 4000, height: 3000 };
  const record = serializeDraft(state);
  assert.deepEqual(Object.keys(record).sort(), ['exportOptions', 'orderId', 'project', 'version']);
  assert.equal(record.version, 1);
  assert.equal('ui' in record, false);
  assert.equal('bitmap' in record.project.layers[0], false);
});

test('serializeDraft is a deep copy', () => {
  const state = makeState();
  const record = serializeDraft(state);
  assert.notEqual(record.project, state.project);
  assert.notEqual(record.project.customModel, state.project.customModel);
  assert.notEqual(record.project.layers, state.project.layers);
  assert.notEqual(record.project.layers[0], state.project.layers[0]);
  assert.notEqual(record.project.layers[0].crop, state.project.layers[0].crop);
  assert.notEqual(record.exportOptions, state.exportOptions);
});

test('the hand-written valid record parses', () => {
  assert.notEqual(parseDraft(validRecord(), ['img-a']), null);
});

test('unknown extra fields are dropped', () => {
  const record = validRecord();
  record.extra = 1;
  record.project.zoom = 2;
  record.project.layers[0].bitmap = {};
  record.project.layers[0].crop.angle = 3;
  record.exportOptions.quality = 0.9;
  const parsed = parseDraft(record, ['img-a']);
  assert.equal('zoom' in parsed.project, false);
  assert.equal('bitmap' in parsed.project.layers[0], false);
  assert.equal('angle' in parsed.project.layers[0].crop, false);
  assert.equal('quality' in parsed.exportOptions, false);
  assert.deepEqual(Object.keys(parsed).sort(), ['exportOptions', 'orderId', 'project']);
});

// Each case: a name and a change that makes the valid record invalid.
const REJECTED = [
  ['record is null', () => null],
  ['record is a string', () => 'rascunho'],
  ['record is an array', () => []],
  ['version 2', (r) => { r.version = 2; }],
  ['version missing', (r) => { delete r.version; }],
  ['version "1"', (r) => { r.version = '1'; }],
  ['project missing', (r) => { delete r.project; }],
  ['modelId missing', (r) => { delete r.project.modelId; }],
  ['customModel missing', (r) => { delete r.project.customModel; }],
  ['layers missing', (r) => { delete r.project.layers; }],
  ['background missing', (r) => { delete r.project.background; }],
  ['exportOptions missing', (r) => { delete r.exportOptions; }],
  ['orderId missing', (r) => { delete r.orderId; }],
  ['layer crop missing', (r) => { delete r.project.layers[0].crop; }],
  ['layer imageId missing', (r) => { delete r.project.layers[0].imageId; }],
  ['cx NaN', (r) => { r.project.layers[0].cx = NaN; }],
  ['cy Infinity', (r) => { r.project.layers[0].cy = Infinity; }],
  ['width as a string', (r) => { r.project.layers[0].width = '50'; }],
  ['rotation true', (r) => { r.project.layers[0].rotation = true; }],
  ['naturalWidth NaN', (r) => { r.project.layers[0].naturalWidth = NaN; }],
  ['custom width Infinity', (r) => { r.project.customModel.width = Infinity; }],
  ['bleedMm NaN', (r) => { r.exportOptions.bleedMm = NaN; }],
  ['layer width 0', (r) => { r.project.layers[0].width = 0; }],
  ['layer width negative', (r) => { r.project.layers[0].width = -5; }],
  ['custom width 0', (r) => { r.project.customModel.width = 0; }],
  ['crop x below 0', (r) => { r.project.layers[0].crop.x = -0.1; }],
  ['crop width above 1', (r) => { r.project.layers[0].crop.width = 1.2; }],
  ['crop past the right edge', (r) => { r.project.layers[0].crop = { x: 0.6, y: 0, width: 0.5, height: 1 }; }],
  ['crop height 0', (r) => { r.project.layers[0].crop.height = 0; }],
  ['background named colour', (r) => { r.project.background = 'white'; }],
  ['background short hex', (r) => { r.project.background = '#FFF'; }],
  ['background with alpha', (r) => { r.project.background = '#FFFFFF80'; }],
  ['format pdf', (r) => { r.exportOptions.format = 'pdf'; }],
  ['dpi 200', (r) => { r.exportOptions.dpi = 200; }],
  ['dpi "300"', (r) => { r.exportOptions.dpi = '300'; }],
  ['clip circle', (r) => { r.exportOptions.clip = 'circle'; }],
  ['image not available', (r) => { r.project.layers[0].imageId = 'img-z'; }],
];

for (const [name, change] of REJECTED) {
  test(`rejected: ${name}`, () => {
    const record = validRecord();
    const replaced = change(record);
    assert.equal(parseDraft(replaced === undefined ? record : replaced, ['img-a']), null);
  });
}

test('rejected: an empty image list with one layer', () => {
  assert.equal(parseDraft(validRecord(), []), null);
});
