import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootProject } from '../js/main.js';

const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

test('bootProject: catalog loaded changes nothing', () => {
  assert.deepEqual(bootProject(true), {});
});

test('bootProject: catalog failed switches to the custom model', () => {
  assert.deepEqual(bootProject(false), { modelId: 'custom' });
});

test('main.js imports the state, the catalog and the stage', () => {
  assert.match(main, /from '\.\/state\.js';/);
  assert.match(main, /from '\.\/catalog\.js';/);
  assert.match(main, /from '\.\/stage\.js';/);
});

test('main.js shows the catalog error notice with the pt-BR texts', () => {
  assert.ok(main.includes("strong: 'Não foi possível carregar os modelos.'"));
  assert.ok(main.includes("text: 'Use o modelo personalizado.'"));
});
