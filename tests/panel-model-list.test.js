import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../js/catalog.js';
import { modelListView, thumbBox } from '../js/panels/model.js';

const roundRect = (x, y, width, height, radius) => ({ shape: 'roundRect', x, y, width, height, radius });

const list = [
  { id: 'apple-iphone-13', brand: 'Apple', name: 'iPhone 13', case: { width: 71.5, height: 146.7, cornerRadius: 12 }, cutouts: [roundRect(4, 4, 32, 32, 9)], bleed: 2, verified: false },
  { id: 'apple-iphone-14', brand: 'Apple', name: 'iPhone 14', case: { width: 71.5, height: 146.7, cornerRadius: 12 }, cutouts: [roundRect(4, 4, 33, 33, 9)], bleed: 2, verified: false },
  { id: 'apple-iphone-15', brand: 'Apple', name: 'iPhone 15', case: { width: 71.6, height: 147.6, cornerRadius: 12 }, cutouts: [roundRect(4, 4, 34, 34, 9)], bleed: 2, verified: false },
  { id: 'apple-iphone-15-pro-max', brand: 'Apple', name: 'iPhone 15 Pro Max', case: { width: 76.7, height: 159.9, cornerRadius: 13 }, cutouts: [roundRect(4, 4, 38, 38, 10)], bleed: 2, verified: false },
  { id: 'samsung-galaxy-s24', brand: 'Samsung', name: 'Galaxy S24', case: { width: 70.6, height: 147.0, cornerRadius: 9 }, cutouts: [roundRect(5, 5, 12, 36, 6)], bleed: 2, verified: false },
  { id: 'motorola-moto-g54', brand: 'Motorola', name: 'Moto G54', case: { width: 73.8, height: 161.6, cornerRadius: 9 }, cutouts: [roundRect(5, 5, 22, 30, 6)], bleed: 2, verified: false },
];
const catalog = createCatalog(list);
const ids = (view) => view.cards.map((card) => card.id);

test('brands: "Todas" first, then the catalog brands in order', () => {
  assert.deepEqual(modelListView(catalog, {}).brands, ['Todas', 'Apple', 'Samsung', 'Motorola']);
});

test('cards: whole entries for iPhone 15 and Galaxy S24', () => {
  const view = modelListView(catalog, { query: '', brand: null, selectedId: 'apple-iphone-15' });
  assert.equal(view.cards.length, 6);
  assert.equal(view.empty, null);
  assert.deepEqual(view.cards[2], {
    id: 'apple-iphone-15',
    name: 'iPhone 15',
    detail: 'Apple · 71,6 × 147,6 mm',
    approx: true,
    selected: true,
  });
  assert.deepEqual(view.cards[4], {
    id: 'samsung-galaxy-s24',
    name: 'Galaxy S24',
    detail: 'Samsung · 70,6 × 147,0 mm',
    approx: true,
    selected: false,
  });
});

test('selected flag: only the selected id', () => {
  const view = modelListView(catalog, { selectedId: 'motorola-moto-g54' });
  assert.deepEqual(
    view.cards.map((card) => card.selected),
    [false, false, false, false, false, true],
  );
  const none = modelListView(catalog, { selectedId: 'custom' });
  assert.equal(none.cards.some((card) => card.selected), false);
});

test('brand filter keeps only that brand', () => {
  assert.deepEqual(ids(modelListView(catalog, { brand: 'Samsung' })), ['samsung-galaxy-s24']);
  assert.deepEqual(ids(modelListView(catalog, { brand: 'Apple' })), [
    'apple-iphone-13',
    'apple-iphone-14',
    'apple-iphone-15',
    'apple-iphone-15-pro-max',
  ]);
});

test('search and brand combine', () => {
  assert.deepEqual(ids(modelListView(catalog, { query: 'pro', brand: 'Apple' })), ['apple-iphone-15-pro-max']);
  assert.deepEqual(ids(modelListView(catalog, { query: 'galaxy' })), ['samsung-galaxy-s24']);
});

test('no match: empty cards and the empty text', () => {
  const view = modelListView(catalog, { query: 'pixel' });
  assert.deepEqual(view.cards, []);
  assert.equal(view.empty, 'Nenhum modelo encontrado. Use o modelo personalizado abaixo.');
  const wrongBrand = modelListView(catalog, { query: 'galaxy', brand: 'Apple' });
  assert.equal(wrongBrand.empty, 'Nenhum modelo encontrado. Use o modelo personalizado abaixo.');
});

test('verified model has no approx flag', () => {
  const verified = createCatalog([{ ...list[2], verified: true }]);
  assert.equal(modelListView(verified, {}).cards[0].approx, false);
});

test('thumbBox: 54px high, width in proportion, at least 20', () => {
  assert.deepEqual(thumbBox(list[2]), { width: 26, height: 54 });
  assert.deepEqual(thumbBox(list[3]), { width: 26, height: 54 });
  assert.deepEqual(thumbBox({ case: { width: 10, height: 100, cornerRadius: 0 } }), { width: 20, height: 54 });
});
