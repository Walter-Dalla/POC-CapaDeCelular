import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextTab, noticeView, TABS } from '../js/main.js';

test('main.js imports in Node without a DOM and lists the three tabs', () => {
  assert.equal(typeof document, 'undefined');
  assert.deepEqual(TABS, ['model', 'images', 'export']);
});

test('nextTab: ArrowRight cycles forward', () => {
  assert.equal(nextTab('model', 'ArrowRight'), 'images');
  assert.equal(nextTab('images', 'ArrowRight'), 'export');
  assert.equal(nextTab('export', 'ArrowRight'), 'model');
});

test('nextTab: ArrowLeft cycles backward', () => {
  assert.equal(nextTab('model', 'ArrowLeft'), 'export');
  assert.equal(nextTab('export', 'ArrowLeft'), 'images');
  assert.equal(nextTab('images', 'ArrowLeft'), 'model');
});

test('nextTab: Home and End jump to the ends', () => {
  assert.equal(nextTab('images', 'Home'), 'model');
  assert.equal(nextTab('export', 'Home'), 'model');
  assert.equal(nextTab('model', 'End'), 'export');
  assert.equal(nextTab('images', 'End'), 'export');
});

test('nextTab: other keys do not move', () => {
  assert.equal(nextTab('model', 'Enter'), null);
  assert.equal(nextTab('images', 'ArrowDown'), null);
  assert.equal(nextTab('export', 'a'), null);
});

test('noticeView: error is a floating alert', () => {
  assert.deepEqual(noticeView({ kind: 'error', strong: 'Erro.', text: 'Algo falhou.' }), {
    className: 'notice notice--error notice--floating',
    role: 'alert',
  });
});

test('noticeView: warn and info are floating statuses', () => {
  assert.deepEqual(noticeView({ kind: 'warn', strong: 'Atenção.', text: 'Baixa resolução.' }), {
    className: 'notice notice--warn notice--floating',
    role: 'status',
  });
  assert.deepEqual(noticeView({ kind: 'info', strong: 'Informação.', text: 'Nada sai daqui.' }), {
    className: 'notice notice--info notice--floating',
    role: 'status',
  });
});

test('panel stubs export mount and the panel stylesheets exist', async () => {
  for (const name of ['model', 'images', 'export']) {
    const panel = await import(`../js/panels/${name}.js`);
    assert.equal(typeof panel.mount, 'function');
    const css = readFileSync(new URL(`../css/panel-${name}.css`, import.meta.url), 'utf8');
    assert.ok(css.trim().startsWith('/*'));
  }
});
