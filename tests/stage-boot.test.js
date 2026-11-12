import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootProject, linkTabs } from '../js/main.js';
import { createStore } from '../js/state.js';

// Tabs that record every `show` and, like the page's tabs, fire onChange only
// when the shown tab really changes.
function fakeTabs(initial) {
  const listeners = [];
  const tabs = {
    shown: [],
    now: initial,
    current: () => tabs.now,
    show(name) {
      tabs.shown.push(name);
      const changed = name !== tabs.now;
      tabs.now = name;
      if (changed) for (const fn of listeners) fn(name);
    },
    onChange(fn) {
      listeners.push(fn);
    },
    click(name) {
      tabs.now = name;
      for (const fn of listeners) fn(name);
    },
  };
  return tabs;
}

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

test('linkTabs: a tab change sets ui.tab and shows nothing back', () => {
  const store = createStore();
  const tabs = fakeTabs('model');
  linkTabs({ state: store, tabs });
  tabs.click('images');
  assert.equal(store.getState().ui.tab, 'images');
  assert.deepEqual(tabs.shown, []);
});

test('linkTabs: a change of ui.tab shows its tab once, with no loop', () => {
  const store = createStore();
  const tabs = fakeTabs('model');
  linkTabs({ state: store, tabs });
  store.setUi({ tab: 'export' });
  assert.deepEqual(tabs.shown, ['export']);
  store.setUi({ tab: 'images' });
  assert.deepEqual(tabs.shown, ['export', 'images']);
  assert.equal(store.getState().ui.tab, 'images');
});

test('linkTabs: shows the state tab at link time only when the tabs differ', () => {
  const same = fakeTabs('model');
  linkTabs({ state: createStore(), tabs: same });
  assert.deepEqual(same.shown, []);
  const other = fakeTabs('export');
  linkTabs({ state: createStore(), tabs: other });
  assert.deepEqual(other.shown, ['model']);
});

test('main.js catches a rejection of boot() and shows the boot error notice', () => {
  assert.match(main, /boot\(\)\.catch\(/);
  assert.ok(main.includes("strong: 'Não foi possível iniciar o editor.'"));
  assert.ok(main.includes("text: 'Recarregue a página.'"));
});

test('main.js creates the image registry and mounts the gestures', () => {
  assert.match(main, /createRegistry\(\{ decode: defaultDecode, newId \}\)/);
  assert.match(main, /mountGestures\(ctx\)/);
});

test('main.js shows the catalog error notice with the pt-BR texts', () => {
  assert.ok(main.includes("strong: 'Não foi possível carregar os modelos.'"));
  assert.ok(main.includes("text: 'Use o modelo personalizado.'"));
});
