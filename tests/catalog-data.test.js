import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateModel, validateCatalog } from '../js/catalog.js';

const catalog = JSON.parse(readFileSync(new URL('../data/models.json', import.meta.url), 'utf8'));

const valid = {
  id: 'apple-iphone-15',
  brand: 'Apple',
  name: 'iPhone 15',
  case: { width: 71.6, height: 147.6, cornerRadius: 12 },
  cutouts: [{ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 9 }],
  bleed: 2,
  verified: false,
};

const withCase = (patch) => ({ ...valid, case: { ...valid.case, ...patch } });
const withCutout = (cutout) => ({ ...valid, cutouts: [cutout] });

test('models.json is a valid catalog of six entries in order', () => {
  assert.deepEqual(validateCatalog(catalog), []);
  assert.equal(catalog.length, 6);
  assert.deepEqual(
    catalog.map((m) => m.id),
    [
      'apple-iphone-13',
      'apple-iphone-14',
      'apple-iphone-15',
      'apple-iphone-15-pro-max',
      'samsung-galaxy-s24',
      'motorola-moto-g54',
    ],
  );
});

test('models.json has the sourced width x height of each model', () => {
  assert.deepEqual(
    catalog.map((m) => [m.case.width, m.case.height]),
    [
      [71.5, 146.7],
      [71.5, 146.7],
      [71.6, 147.6],
      [76.7, 159.9],
      [70.6, 147.0],
      [73.8, 161.6],
    ],
  );
});

test('models.json marks every entry bleed 2 and unverified', () => {
  for (const m of catalog) {
    assert.equal(m.bleed, 2, m.id);
    assert.equal(m.verified, false, m.id);
  }
});

test('the base entry is valid, also with a circle cutout and a safeMargin', () => {
  assert.deepEqual(validateModel(valid), []);
  assert.deepEqual(validateModel(withCutout({ shape: 'circle', cx: 20, cy: 20, r: 10 })), []);
  assert.deepEqual(validateModel({ ...valid, safeMargin: 3 }), []);
  assert.deepEqual(validateModel({ ...valid, cutouts: [] }), []);
});

const failing = {
  'entry not an object': null,
  'id missing': { ...valid, id: undefined },
  'id empty': { ...valid, id: '' },
  'id with upper case': { ...valid, id: 'Apple-iPhone' },
  'id with space': { ...valid, id: 'apple iphone' },
  'brand empty': { ...valid, brand: '' },
  'brand not a string': { ...valid, brand: 12 },
  'name empty': { ...valid, name: '   ' },
  'case missing': { ...valid, case: undefined },
  'width zero': withCase({ width: 0 }),
  'width negative': withCase({ width: -1 }),
  'width above 500': withCase({ width: 500.1 }),
  'width as string': withCase({ width: '71.6' }),
  'height true': withCase({ height: true }),
  'height null': withCase({ height: null }),
  'height NaN': withCase({ height: NaN }),
  'height Infinity': withCase({ height: Infinity }),
  'cornerRadius negative': withCase({ cornerRadius: -1 }),
  'cornerRadius above half the shorter side': withCase({ cornerRadius: 35.9 }),
  'cornerRadius as string': withCase({ cornerRadius: '12' }),
  'bleed negative': { ...valid, bleed: -0.5 },
  'bleed above 10': { ...valid, bleed: 11 },
  'bleed null': { ...valid, bleed: null },
  'safeMargin above 20': { ...valid, safeMargin: 21 },
  'safeMargin negative': { ...valid, safeMargin: -1 },
  'safeMargin as string': { ...valid, safeMargin: '3' },
  'verified not boolean': { ...valid, verified: 'false' },
  'cutouts not a list': { ...valid, cutouts: {} },
  'cutout of unknown shape': withCutout({ shape: 'star', x: 4, y: 4, width: 10, height: 10 }),
  'cutout not an object': withCutout(null),
  'roundRect zero width': withCutout({ shape: 'roundRect', x: 4, y: 4, width: 0, height: 34, radius: 0 }),
  'roundRect negative height': withCutout({ shape: 'roundRect', x: 4, y: 4, width: 34, height: -2, radius: 0 }),
  'roundRect width as string': withCutout({ shape: 'roundRect', x: 4, y: 4, width: '34', height: 34, radius: 9 }),
  'roundRect past the right edge': withCutout({ shape: 'roundRect', x: 40, y: 4, width: 34, height: 34, radius: 9 }),
  'roundRect past the bottom edge': withCutout({ shape: 'roundRect', x: 4, y: 120, width: 34, height: 34, radius: 9 }),
  'roundRect negative x': withCutout({ shape: 'roundRect', x: -1, y: 4, width: 34, height: 34, radius: 9 }),
  'roundRect radius above half its shorter side': withCutout({ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 18 }),
  'circle zero radius': withCutout({ shape: 'circle', cx: 20, cy: 20, r: 0 }),
  'circle past the left edge': withCutout({ shape: 'circle', cx: 5, cy: 20, r: 10 }),
  'circle past the top edge': withCutout({ shape: 'circle', cx: 20, cy: 5, r: 10 }),
  'circle r NaN': withCutout({ shape: 'circle', cx: 20, cy: 20, r: NaN }),
};

for (const [name, entry] of Object.entries(failing)) {
  test(`validateModel rejects: ${name}`, () => {
    const errors = validateModel(entry);
    assert.ok(Array.isArray(errors));
    assert.ok(errors.length > 0, `expected an error for ${name}`);
    for (const error of errors) assert.equal(typeof error, 'string');
  });
}

test('validateCatalog rejects a non-array', () => {
  assert.equal(validateCatalog({}).length, 1);
  assert.equal(validateCatalog(null).length, 1);
});

test('validateCatalog rejects a duplicate id', () => {
  const errors = validateCatalog([valid, { ...valid }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /apple-iphone-15/);
});

test('validateCatalog reports the invalid entry', () => {
  const errors = validateCatalog([valid, { ...valid, id: 'other', bleed: 20 }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^\[1\]/);
});
