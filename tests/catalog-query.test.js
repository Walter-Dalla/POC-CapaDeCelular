import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeSearch,
  createCatalog,
  validateCustom,
  resolveModel,
  loadCatalog,
  DEFAULT_MODEL_ID,
} from '../js/catalog.js';

const list = JSON.parse(readFileSync(new URL('../data/models.json', import.meta.url), 'utf8'));
const catalog = createCatalog(list);
const ids = (models) => models.map((m) => m.id);

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('normalizeSearch trims, lowers and removes accents', () => {
  assert.equal(normalizeSearch('  GALÁXY Ação '), 'galaxy acao');
  assert.equal(normalizeSearch(''), '');
});

test('listBrands follows the order of first appearance', () => {
  assert.deepEqual(catalog.listBrands(), ['Apple', 'Samsung', 'Motorola']);
});

test('listModels without filter returns all six in order', () => {
  assert.deepEqual(ids(catalog.listModels()), [
    'apple-iphone-13',
    'apple-iphone-14',
    'apple-iphone-15',
    'apple-iphone-15-pro-max',
    'samsung-galaxy-s24',
    'motorola-moto-g54',
  ]);
});

test('listModels query matches every word of brand and name', () => {
  assert.deepEqual(ids(catalog.listModels({ query: 'galaxy s24' })), ['samsung-galaxy-s24']);
  assert.deepEqual(ids(catalog.listModels({ query: 'GALÁXY' })), ['samsung-galaxy-s24']);
  assert.deepEqual(ids(catalog.listModels({ query: ' iphone 15 ' })), [
    'apple-iphone-15',
    'apple-iphone-15-pro-max',
  ]);
  assert.deepEqual(ids(catalog.listModels({ query: 'xyz' })), []);
  assert.deepEqual(ids(catalog.listModels({ query: 'apple 15 pro' })), ['apple-iphone-15-pro-max']);
});

test('listModels filters by brand, then by query', () => {
  assert.deepEqual(ids(catalog.listModels({ brand: 'Motorola' })), ['motorola-moto-g54']);
  assert.deepEqual(ids(catalog.listModels({ brand: 'Apple', query: '14' })), ['apple-iphone-14']);
  assert.deepEqual(ids(catalog.listModels({ brand: 'Samsung', query: 'iphone' })), []);
});

test('getModel returns the entry or null', () => {
  assert.equal(catalog.getModel('apple-iphone-15').name, 'iPhone 15');
  assert.equal(catalog.getModel('nope'), null);
});

test('DEFAULT_MODEL_ID is the iPhone 15', () => {
  assert.equal(DEFAULT_MODEL_ID, 'apple-iphone-15');
});

test('validateCustom accepts valid values', () => {
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: 40, bleed: 0 }), {});
  assert.deepEqual(validateCustom({ width: 500, height: 500, cornerRadius: 0, bleed: 10 }), {});
});

test('validateCustom messages for width and height', () => {
  assert.deepEqual(validateCustom({ width: null, height: 0, cornerRadius: 0, bleed: 2 }), {
    width: 'Informe um valor maior que zero.',
    height: 'Informe um valor maior que zero.',
  });
  assert.deepEqual(validateCustom({ width: -5, height: NaN, cornerRadius: 0, bleed: 2 }), {
    width: 'Informe um valor maior que zero.',
    height: 'Informe um valor maior que zero.',
  });
  assert.deepEqual(validateCustom({ width: 500.5, height: 600, cornerRadius: 0, bleed: 2 }), {
    width: 'Informe um valor de até 500 mm.',
    height: 'Informe um valor de até 500 mm.',
  });
});

test('validateCustom messages for the corner radius', () => {
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: null, bleed: 2 }), {
    cornerRadius: 'Informe um valor de zero ou mais.',
  });
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: -1, bleed: 2 }), {
    cornerRadius: 'Informe um valor de zero ou mais.',
  });
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: 40.5, bleed: 2 }), {
    cornerRadius: 'O raio não pode passar da metade do lado menor.',
  });
});

test('validateCustom messages for the bleed', () => {
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: 10, bleed: null }), {
    bleed: 'Informe um valor entre 0 e 10 mm.',
  });
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: 10, bleed: 10.5 }), {
    bleed: 'Informe um valor entre 0 e 10 mm.',
  });
  assert.deepEqual(validateCustom({ width: 80, height: 160, cornerRadius: 10, bleed: -1 }), {
    bleed: 'Informe um valor entre 0 e 10 mm.',
  });
});

const customShape = {
  id: 'custom',
  brand: '',
  name: 'Modelo personalizado',
  case: { width: 80, height: 160, cornerRadius: 10 },
  cutouts: [],
  bleed: 3,
  verified: false,
};
const customModel = { width: 80, height: 160, cornerRadius: 10, bleed: 3 };

test('resolveModel returns the catalog entry of the id', () => {
  const model = resolveModel({ modelId: 'samsung-galaxy-s24', customModel }, catalog);
  assert.equal(model.id, 'samsung-galaxy-s24');
  assert.deepEqual(model.case, { width: 70.6, height: 147.0, cornerRadius: 9 });
});

test('resolveModel builds the custom model for the id custom', () => {
  assert.deepEqual(resolveModel({ modelId: 'custom', customModel }, catalog), customShape);
});

test('resolveModel falls back to the custom model for an unknown id or no catalog', () => {
  assert.deepEqual(resolveModel({ modelId: 'nokia-3310', customModel }, catalog), customShape);
  assert.deepEqual(resolveModel({ modelId: 'apple-iphone-15', customModel }, null), customShape);
});

const respond = (status, body) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => JSON.parse(body),
});

test('loadCatalog fetches the default url and builds the catalog', async () => {
  let asked = null;
  globalThis.fetch = async (url) => {
    asked = url;
    return respond(200, JSON.stringify(list))();
  };
  const loaded = await loadCatalog();
  assert.equal(asked, './data/models.json');
  assert.deepEqual(loaded.listBrands(), ['Apple', 'Samsung', 'Motorola']);
});

test('loadCatalog rejects on network error, bad status, invalid JSON or invalid entries', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('network');
  };
  await assert.rejects(loadCatalog());
  globalThis.fetch = respond(404, '[]');
  await assert.rejects(loadCatalog());
  globalThis.fetch = respond(200, '{not json');
  await assert.rejects(loadCatalog());
  globalThis.fetch = respond(200, JSON.stringify([{ id: 'x' }]));
  await assert.rejects(loadCatalog());
  globalThis.fetch = respond(200, '{}');
  await assert.rejects(loadCatalog());
});
