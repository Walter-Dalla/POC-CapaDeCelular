import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setJpegDpi, readJpegDpi } from '../js/png-dpi.js';

// Tail shared by the samples: a DQT stub, then EOI.
const TAIL = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x01, 0xff, 0xd9];

// SOI + JFIF APP0 at 72 DPI (units 1, 00 48) + tail.
const jfif72 = Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
  ...TAIL,
]);

// SOI + APP1 Exif stub + tail.
const APP1 = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const exif = Uint8Array.from([0xff, 0xd8, ...APP1, ...TAIL]);

// SOI + JFIF APP0 with units 0 (aspect ratio only).
const jfifNoUnits = Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ...TAIL,
]);

test('setJpegDpi rewrites the JFIF density in place', () => {
  const out = setJpegDpi(jfif72, 300);
  assert.equal(out.length, jfif72.length);
  assert.deepEqual(
    out,
    Uint8Array.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x01, 0x2c, 0x01, 0x2c, 0x00, 0x00,
      ...TAIL,
    ]),
  );
  assert.equal(jfif72[14], 0x00, 'input untouched');
});

test('setJpegDpi sets units 1 on a JFIF header with units 0', () => {
  const out = setJpegDpi(jfifNoUnits, 300);
  assert.deepEqual([...out.slice(13, 18)], [0x01, 0x01, 0x2c, 0x01, 0x2c]);
  assert.equal(out.length, jfifNoUnits.length);
});

test('setJpegDpi inserts an 18-byte JFIF APP0 before an Exif APP1', () => {
  const out = setJpegDpi(exif, 300);
  assert.equal(out.length, exif.length + 18);
  assert.deepEqual(
    out,
    Uint8Array.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x01, 0x2c, 0x01, 0x2c, 0x00, 0x00,
      ...APP1,
      ...TAIL,
    ]),
  );
});

test('setJpegDpi throws on non-JPEG input', () => {
  const expected = { message: 'JPEG inválido' };
  assert.throws(() => setJpegDpi(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]), 300), expected);
  assert.throws(() => setJpegDpi(Uint8Array.from([0xff, 0xd8]), 300), expected);
  assert.throws(() => setJpegDpi(Uint8Array.from([0xff, 0xd8, 0x00, 0x00]), 300), expected);
  assert.throws(() => setJpegDpi(jfif72.slice(0, 12), 300), expected);
});

test('readJpegDpi on JFIF, Exif and units 0', () => {
  assert.equal(readJpegDpi(jfif72), 72);
  assert.equal(readJpegDpi(setJpegDpi(jfif72, 300)), 300);
  assert.equal(readJpegDpi(exif), null);
  assert.equal(readJpegDpi(setJpegDpi(exif, 300)), 300);
  assert.equal(readJpegDpi(jfifNoUnits), null);
});

test('readJpegDpi converts dots per centimetre', () => {
  // units 2, density 118 dots/cm = 299.72 DPI, rounded to 300.
  const perCm = jfif72.slice();
  perCm.set([0x02, 0x00, 0x76, 0x00, 0x76], 13);
  assert.equal(readJpegDpi(perCm), 300);
});
