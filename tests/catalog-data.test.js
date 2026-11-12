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

// Each failing case: the entry and the exact errors validateModel returns for it.
const P = 'apple-iphone-15: ';
const TEXT = 'deve ser um texto não vazio';
const SIDE = 'deve ser um número maior que 0 e até 500';
const RADIUS = 'deve estar entre 0 e a metade do lado menor';
const INSIDE = `${P}cutouts[0]: deve ficar inteiro dentro da capa`;

const failing = {
  'entry not an object': [null, ['modelo: deve ser um objeto']],
  'id missing': [{ ...valid, id: undefined }, [`id: ${TEXT}`]],
  'id empty': [{ ...valid, id: '' }, [`id: ${TEXT}`]],
  'id with upper case': [{ ...valid, id: 'Apple-iPhone' }, ['Apple-iPhone: id: só letras minúsculas, dígitos e hífen']],
  'id with space': [{ ...valid, id: 'apple iphone' }, ['apple iphone: id: só letras minúsculas, dígitos e hífen']],
  'brand empty': [{ ...valid, brand: '' }, [`${P}brand: ${TEXT}`]],
  'brand not a string': [{ ...valid, brand: 12 }, [`${P}brand: ${TEXT}`]],
  'name empty': [{ ...valid, name: '   ' }, [`${P}name: ${TEXT}`]],
  'case missing': [{ ...valid, case: undefined }, [`${P}case: deve ser um objeto`]],
  'width zero': [withCase({ width: 0 }), [`${P}case.width: ${SIDE}`]],
  'width negative': [withCase({ width: -1 }), [`${P}case.width: ${SIDE}`]],
  'width above 500': [withCase({ width: 500.1 }), [`${P}case.width: ${SIDE}`]],
  'width as string': [withCase({ width: '71.6' }), [`${P}case.width: ${SIDE}`]],
  'height true': [withCase({ height: true }), [`${P}case.height: ${SIDE}`]],
  'height null': [withCase({ height: null }), [`${P}case.height: ${SIDE}`]],
  'height NaN': [withCase({ height: NaN }), [`${P}case.height: ${SIDE}`]],
  'height Infinity': [withCase({ height: Infinity }), [`${P}case.height: ${SIDE}`]],
  'cornerRadius negative': [withCase({ cornerRadius: -1 }), [`${P}case.cornerRadius: ${RADIUS}`]],
  'cornerRadius above half the shorter side': [withCase({ cornerRadius: 35.9 }), [`${P}case.cornerRadius: ${RADIUS}`]],
  'cornerRadius as string': [withCase({ cornerRadius: '12' }), [`${P}case.cornerRadius: ${RADIUS}`]],
  'bleed negative': [{ ...valid, bleed: -0.5 }, [`${P}bleed: deve estar entre 0 e 10`]],
  'bleed above 10': [{ ...valid, bleed: 11 }, [`${P}bleed: deve estar entre 0 e 10`]],
  'bleed null': [{ ...valid, bleed: null }, [`${P}bleed: deve ser um número`]],
  'safeMargin above 20': [{ ...valid, safeMargin: 21 }, [`${P}safeMargin: deve estar entre 0 e 20`]],
  'safeMargin negative': [{ ...valid, safeMargin: -1 }, [`${P}safeMargin: deve estar entre 0 e 20`]],
  'safeMargin as string': [{ ...valid, safeMargin: '3' }, [`${P}safeMargin: deve ser um número`]],
  'verified not boolean': [{ ...valid, verified: 'false' }, [`${P}verified: deve ser booleano`]],
  'cutouts not a list': [{ ...valid, cutouts: {} }, [`${P}cutouts: deve ser uma lista`]],
  'cutout of unknown shape': [
    withCutout({ shape: 'star', x: 4, y: 4, width: 10, height: 10 }),
    [`${P}cutouts[0]: formato desconhecido`],
  ],
  'cutout not an object': [withCutout(null), [`${P}cutouts[0]: deve ser um objeto`]],
  'roundRect zero width': [
    withCutout({ shape: 'roundRect', x: 4, y: 4, width: 0, height: 34, radius: 0 }),
    [`${P}cutouts[0]: largura e altura devem ser maiores que zero`],
  ],
  'roundRect zero height': [
    withCutout({ shape: 'roundRect', x: 4, y: 4, width: 34, height: 0, radius: 0 }),
    [`${P}cutouts[0]: largura e altura devem ser maiores que zero`],
  ],
  'roundRect width as string': [
    withCutout({ shape: 'roundRect', x: 4, y: 4, width: '34', height: 34, radius: 9 }),
    [`${P}cutouts[0]: x, y, width, height e radius devem ser números`],
  ],
  'roundRect past the right edge': [
    withCutout({ shape: 'roundRect', x: 40, y: 4, width: 34, height: 34, radius: 9 }),
    [INSIDE],
  ],
  'roundRect past the bottom edge': [
    withCutout({ shape: 'roundRect', x: 4, y: 120, width: 34, height: 34, radius: 9 }),
    [INSIDE],
  ],
  'roundRect negative x': [
    withCutout({ shape: 'roundRect', x: -1, y: 4, width: 34, height: 34, radius: 9 }),
    [INSIDE],
  ],
  'roundRect radius above half its shorter side': [
    withCutout({ shape: 'roundRect', x: 4, y: 4, width: 34, height: 34, radius: 18 }),
    [`${P}cutouts[0]: radius ${RADIUS}`],
  ],
  'circle zero radius': [
    withCutout({ shape: 'circle', cx: 20, cy: 20, r: 0 }),
    [`${P}cutouts[0]: r deve ser maior que zero`],
  ],
  'circle past the left edge': [withCutout({ shape: 'circle', cx: 5, cy: 20, r: 10 }), [INSIDE]],
  'circle past the top edge': [withCutout({ shape: 'circle', cx: 20, cy: 5, r: 10 }), [INSIDE]],
  'circle r NaN': [
    withCutout({ shape: 'circle', cx: 20, cy: 20, r: NaN }),
    [`${P}cutouts[0]: cx, cy e r devem ser números`],
  ],
};

for (const [name, [entry, expected]] of Object.entries(failing)) {
  test(`validateModel rejects: ${name}`, () => {
    assert.deepEqual(validateModel(entry), expected);
  });
}

test('validateCatalog rejects a non-array', () => {
  assert.deepEqual(validateCatalog({}), ['catálogo: deve ser uma lista']);
  assert.deepEqual(validateCatalog(null), ['catálogo: deve ser uma lista']);
});

test('validateCatalog rejects a duplicate id', () => {
  assert.deepEqual(validateCatalog([valid, { ...valid }]), ['[1] apple-iphone-15: id repetido']);
});

test('validateCatalog reports the invalid entry', () => {
  assert.deepEqual(validateCatalog([valid, { ...valid, id: 'other', bleed: 20 }]), [
    '[1] other: bleed: deve estar entre 0 e 10',
  ]);
});
