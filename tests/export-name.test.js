import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrderId, exportFileName } from '../js/export-name.js';

const base = {
  orderId: '',
  modelId: 'apple-iphone-15',
  widthMm: 75.6,
  heightMm: 151.6,
  dpi: 300,
  format: 'png',
};

test('file name without order', () => {
  assert.equal(exportFileName(base), 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
});

test('file name with an order id', () => {
  assert.equal(
    exportFileName({ ...base, orderId: '1234 João Silva' }),
    '1234-joao-silva-capa-apple-iphone-15-75.6x151.6mm-300dpi.png',
  );
});

test('an order with nothing usable adds no prefix', () => {
  assert.equal(exportFileName({ ...base, orderId: '  ' }), 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
  assert.equal(exportFileName({ ...base, orderId: '!!!' }), 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
  assert.equal(exportFileName({ ...base, orderId: undefined }), 'capa-apple-iphone-15-75.6x151.6mm-300dpi.png');
});

test('accents, symbols and runs of separators', () => {
  assert.equal(
    exportFileName({ ...base, orderId: 'Ação/Çé  #7' }),
    'acao-ce-7-capa-apple-iphone-15-75.6x151.6mm-300dpi.png',
  );
});

test('a 60-character order is cut at 40 before normalising', () => {
  const order = `${'a'.repeat(39)} ${'b'.repeat(20)}`;
  assert.equal(order.length, 60);
  assert.equal(normalizeOrderId(order), 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(
    exportFileName({ ...base, orderId: order }),
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-capa-apple-iphone-15-75.6x151.6mm-300dpi.png',
  );
});

test('normalizeOrderId may return an empty string', () => {
  assert.equal(normalizeOrderId('---'), '');
  assert.equal(normalizeOrderId(''), '');
  assert.equal(normalizeOrderId('-Pedido 12-'), 'pedido-12');
});

test('custom model in jpeg with whole millimetres', () => {
  assert.equal(
    exportFileName({ ...base, modelId: 'custom', widthMm: 80, heightMm: 160, dpi: 150, format: 'jpeg' }),
    'capa-personalizado-80x160mm-150dpi.jpg',
  );
});

test('millimetres keep at most one decimal and drop a trailing .0', () => {
  assert.equal(
    exportFileName({ ...base, widthMm: 75.04, heightMm: 151.66 }),
    'capa-apple-iphone-15-75x151.7mm-300dpi.png',
  );
});
