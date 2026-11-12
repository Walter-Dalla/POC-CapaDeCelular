import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTabs, drawerOpen } from '../js/main.js';
import { contrastStrokes, cutLineStrokes } from '../js/stage.js';

// Last value of a property declared for an exact selector of a stylesheet
// (comments dropped; a selector list counts for each of its selectors).
function cssValue(file, selector, property) {
  const css = readFileSync(new URL(`../css/${file}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let value;
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const list = selectors.split(',').map((part) => part.trim().replace(/\s+/g, ' '));
    if (!list.includes(selector)) continue;
    for (const [, name, declared] of body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
      if (name === property) value = declared.trim().replace(/\s+/g, ' ');
    }
  }
  return value;
}

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

test('cutLineStrokes: white dashes over a solid dark under-stroke, as the safe margin', () => {
  assert.deepEqual(cutLineStrokes(), [
    { lineWidth: 3, dash: [], colour: '--color-bg' },
    { lineWidth: 1.5, dash: [6, 4], colour: '--color-text' },
  ]);
  assert.deepEqual(contrastStrokes('--color-warn', [6, 4]), [
    { lineWidth: 3, dash: [], colour: '--color-bg' },
    { lineWidth: 1.5, dash: [6, 4], colour: '--color-warn' },
  ]);
});

test('app.css: a disabled ghost button keeps a transparent background and a dimmed colour', () => {
  for (const selector of ['.btn--ghost:disabled', '.btn--ghost[aria-disabled="true"]']) {
    assert.equal(cssValue('app.css', selector, 'background'), 'transparent', selector);
    assert.equal(cssValue('app.css', selector, 'color'), 'var(--color-border-strong)', selector);
  }
  // The other buttons keep the filled disabled look.
  assert.equal(cssValue('app.css', '.btn:disabled', 'background'), 'var(--color-border)');
});
