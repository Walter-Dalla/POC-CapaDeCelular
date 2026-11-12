import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOption, optionsView } from '../js/panels/export.js';

const iphone15 = {
  id: 'apple-iphone-15',
  brand: 'Apple',
  name: 'iPhone 15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
  verified: false,
};

const defaults = {
  format: 'png',
  dpi: 300,
  bleedOn: true,
  bleedMm: null,
  clip: 'rect',
  cameraHole: false,
  mirror: false,
};

test('JPEG turns the contour cut and the camera hole off', () => {
  const transparent = { ...defaults, clip: 'contour', cameraHole: true };
  assert.deepEqual(applyOption(transparent, { format: 'jpeg' }), {
    format: 'jpeg',
    dpi: 300,
    bleedOn: true,
    bleedMm: null,
    clip: 'rect',
    cameraHole: false,
    mirror: false,
  });
});

test('under JPEG the contour cut and the camera hole are refused', () => {
  const jpeg = { ...defaults, format: 'jpeg' };
  assert.equal(applyOption(jpeg, { clip: 'contour' }), jpeg);
  assert.equal(applyOption(jpeg, { cameraHole: true }), jpeg);
  assert.deepEqual(jpeg, { ...defaults, format: 'jpeg' });
});

test('back to PNG leaves both transparent options off', () => {
  const back = applyOption(applyOption({ ...defaults, clip: 'contour', cameraHole: true }, { format: 'jpeg' }), {
    format: 'png',
  });
  assert.deepEqual(back, defaults);
  assert.deepEqual(applyOption(back, { clip: 'contour' }), { ...defaults, clip: 'contour' });
});

test('the input options are not changed in place', () => {
  const options = { ...defaults, clip: 'contour' };
  applyOption(options, { format: 'jpeg' });
  assert.deepEqual(options, { ...defaults, clip: 'contour' });
});

test('bleedMm accepts 0 to 10 and null, refuses 11', () => {
  assert.equal(applyOption(defaults, { bleedMm: 0 }).bleedMm, 0);
  assert.equal(applyOption(defaults, { bleedMm: 10 }).bleedMm, 10);
  assert.equal(applyOption(defaults, { bleedMm: 2.5 }).bleedMm, 2.5);
  assert.equal(applyOption({ ...defaults, bleedMm: 4 }, { bleedMm: null }).bleedMm, null);
  assert.equal(applyOption(defaults, { bleedMm: 11 }), defaults);
  assert.equal(applyOption(defaults, { bleedMm: -1 }), defaults);
});

test('other options change as asked', () => {
  assert.deepEqual(applyOption(defaults, { dpi: 600 }), { ...defaults, dpi: 600 });
  assert.deepEqual(applyOption(defaults, { mirror: true }), { ...defaults, mirror: true });
  assert.deepEqual(applyOption(defaults, { bleedOn: false }), { ...defaults, bleedOn: false });
  assert.deepEqual(applyOption(defaults, { cameraHole: true }), { ...defaults, cameraHole: true });
});

test('optionsView of the defaults: PNG, 300, rect, bleed on at 2 mm, both others off', () => {
  assert.deepEqual(optionsView(defaults, iphone15), {
    format: { png: true, jpeg: false },
    dpi: { 150: false, 300: true, 600: false },
    clip: { rect: true, contour: false, contourDisabled: false },
    bleed: { checked: true, text: '2 mm', fieldDisabled: false },
    cameraHole: { checked: false, disabled: false },
    mirror: { checked: false },
  });
});

test('optionsView under JPEG disables the contour cut and the camera hole', () => {
  const view = optionsView({ ...defaults, format: 'jpeg' }, iphone15);
  assert.deepEqual(view.format, { png: false, jpeg: true });
  assert.equal(view.clip.contourDisabled, true);
  assert.equal(view.cameraHole.disabled, true);
});

test('optionsView bleed text: chosen value with a comma, field disabled when the bleed is off', () => {
  assert.equal(optionsView({ ...defaults, bleedMm: 2.5 }, iphone15).bleed.text, '2,5 mm');
  assert.deepEqual(optionsView({ ...defaults, bleedOn: false }, iphone15).bleed, {
    checked: false,
    text: '2 mm',
    fieldDisabled: true,
  });
});
