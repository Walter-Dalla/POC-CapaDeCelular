import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 as zlibCrc32 } from 'node:zlib';
import { setPngDpi, readPngDpi } from '../js/png-dpi.js';

// A 1 x 1 RGB PNG: signature, IHDR, IDAT, IEND.
const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
  0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
  0x03, 0x01, 0x01, 0x00, 0xc9, 0xfe, 0x92, 0xef,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const SIGNATURE = png.slice(0, 8);
const IHDR = png.slice(8, 33);
const IDAT = png.slice(33, 57);
const IEND = png.slice(57);

// Reads the chunks back with an independent walker of the test.
function chunks(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const list = [];
  let at = 8;
  while (at < bytes.length) {
    const length = view.getUint32(at);
    const type = Buffer.from(bytes.slice(at + 4, at + 8)).toString('latin1');
    list.push({
      type,
      raw: bytes.slice(at, at + 12 + length),
      data: bytes.slice(at + 8, at + 8 + length),
      crc: view.getUint32(at + 8 + length),
    });
    at += 12 + length;
  }
  return list;
}

test('setPngDpi inserts pHYs right after IHDR with 11811 pixels per metre', () => {
  const out = setPngDpi(png, 300);
  assert.ok(out instanceof Uint8Array);
  assert.deepEqual(out.slice(0, 8), SIGNATURE);
  const list = chunks(out);
  assert.deepEqual(list.map((c) => c.type), ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  const phys = list[1];
  assert.deepEqual([...phys.data], [0x00, 0x00, 0x2e, 0x23, 0x00, 0x00, 0x2e, 0x23, 0x01]);
  const typeAndData = Buffer.concat([Buffer.from('pHYs', 'latin1'), Buffer.from(phys.data)]);
  assert.equal(phys.crc, zlibCrc32(typeAndData));
  assert.deepEqual(list[0].raw, IHDR);
  assert.deepEqual(list[2].raw, IDAT);
  assert.deepEqual(list[3].raw, IEND);
  assert.equal(out.length, png.length + 21);
});

test('setPngDpi replaces an existing pHYs', () => {
  const out = setPngDpi(setPngDpi(png, 300), 600);
  const list = chunks(out);
  assert.deepEqual(list.map((c) => c.type), ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  assert.deepEqual([...list[1].data], [0x00, 0x00, 0x5c, 0x46, 0x00, 0x00, 0x5c, 0x46, 0x01]);
  assert.equal(readPngDpi(out), 600);
});

test('setPngDpi does not change its input', () => {
  const copy = png.slice();
  setPngDpi(png, 300);
  assert.deepEqual(png, copy);
});

test('readPngDpi reads the density, null without pHYs or with unit 0', () => {
  assert.equal(readPngDpi(setPngDpi(png, 300)), 300);
  assert.equal(readPngDpi(png), null);
  const unitZero = setPngDpi(png, 300);
  unitZero[33 + 16] = 0;
  assert.equal(readPngDpi(unitZero), null);
});

test('setPngDpi throws RangeError for a DPI outside 1 to 65535', () => {
  for (const dpi of [0, -300, NaN, Infinity, 65536, 1e9]) {
    assert.throws(() => setPngDpi(png, dpi), RangeError, String(dpi));
  }
  assert.equal(readPngDpi(setPngDpi(png, 65535)), 65535);
  assert.equal(readPngDpi(setPngDpi(png, 1)), 1);
});

test('setPngDpi throws on a truncated or non-PNG input', () => {
  const expected = { message: 'PNG inválido' };
  assert.throws(() => setPngDpi(png.slice(0, 40), 300), expected);
  assert.throws(() => setPngDpi(png.slice(0, 5), 300), expected);
  assert.throws(() => setPngDpi(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), 300), expected);
  const noIhdr = Uint8Array.from([...SIGNATURE, ...IDAT, ...IEND]);
  assert.throws(() => setPngDpi(noIhdr, 300), expected);
  const noIend = Uint8Array.from([...SIGNATURE, ...IHDR, ...IDAT]);
  assert.throws(() => setPngDpi(noIend, 300), expected);
});
