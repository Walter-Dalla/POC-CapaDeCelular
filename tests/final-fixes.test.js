import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTabs, drawerOpen } from '../js/main.js';

// Page with the three tab buttons and panels, `selected` being the tab the
// markup marks aria-selected; elements keep only what createTabs touches.
function fakePage(selected) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const attributes = new Map();
      elements.set(id, {
        id,
        hidden: false,
        tabIndex: 0,
        getAttribute: (name) => attributes.get(name) ?? null,
        setAttribute: (name, value) => attributes.set(name, String(value)),
        addEventListener() {},
        focus() {},
      });
    }
    return elements.get(id);
  };
  for (const tab of ['model', 'images', 'export']) {
    element(`tab-${tab}`).setAttribute('aria-selected', String(tab === selected));
  }
  return { getElementById: element };
}

function withPage(selected, run) {
  const previous = globalThis.document;
  globalThis.document = fakePage(selected);
  try {
    return run();
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
}

test('drawerOpen: Modelo and Exportar open the drawer, Imagens closes it', () => {
  assert.equal(drawerOpen('model'), true);
  assert.equal(drawerOpen('export'), true);
  assert.equal(drawerOpen('images'), false);
});

test('createTabs sets the drawer once from the tab selected in the page', () => {
  for (const [selected, expected] of [
    ['model', [true]],
    ['images', [false]],
    ['export', [true]],
  ]) {
    const calls = [];
    withPage(selected, () => createTabs({ set: (open) => calls.push(open) }));
    assert.deepEqual(calls, expected, selected);
  }
});
