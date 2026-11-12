import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTabs, drawerOpen } from '../js/main.js';
import {
  contrastStrokes,
  cutLineStrokes,
  EMPTY_TEXT_MIN_PX,
  emptyTextFits,
  PREVIEW_MARKS_MIN_PX,
  previewMarks,
} from '../js/stage.js';

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

// 7 buttons of 44px, the spacer and 7 gaps of 4px take 336px; the row of the
// 400px panel is 400 - 1 (panel border) - 2 × 20 (panel padding) - 2 × 2
// (selected card border) - 2 × 8 (card padding) = 339px.
test('panel-images.css: from 900px the layer actions keep one row with a 4px gap', () => {
  const css = readFileSync(new URL('../css/panel-images.css', import.meta.url), 'utf8');
  const media = /@media \(min-width: 900px\) \{([\s\S]*?)\n\}/.exec(css);
  assert.ok(media, 'desktop media block');
  assert.match(media[1], /\.layer-card__actions \{[^}]*flex-wrap: nowrap;[^}]*gap: var\(--space-4\);/);
  assert.match(media[1], /\.layer-card \{[^}]*padding-inline: var\(--space-8\);/);
  assert.ok(7 * 44 + 7 * 4 <= 400 - 1 - 2 * 20 - 2 * 2 - 2 * 8);
  // The 390px compact card keeps its own 4px gap.
  assert.match(css, /\.layer-card--compact \.layer-card__actions \{[^}]*gap: var\(--space-4\);/);
});

// Centred text taller than the room under the cutout would spill above the
// top padding; "safe" aligns it to the start instead.
test('layout.css: the placed empty state never rises above its top padding', () => {
  assert.equal(cssValue('layout.css', '.stage-empty--placed', 'justify-content'), 'safe center');
  const css = readFileSync(new URL('../css/layout.css', import.meta.url), 'utf8');
  const mobile = [...css.matchAll(/@media \(max-width: 899px\) \{([\s\S]*?)\n\}/g)].map((match) => match[1]).join('\n');
  assert.match(mobile, /\.stage-empty--placed \{[^}]*gap: var\(--space-12\);/);
  // The desktop rule keeps the 16px rows of the empty state.
  assert.match(css, /\n\.stage-empty \{[^}]*gap: var\(--space-16\);/);
});

// Case heights seen in the browser: 1440x900 about 609 px, 390x844 with the
// drawer collapsed about 514 px, with the drawer open 0 px.
test('emptyTextFits: the empty-state text shows only over a case 400 px or taller', () => {
  assert.equal(EMPTY_TEXT_MIN_PX, 400);
  assert.equal(emptyTextFits({ height: 609 }), true);
  assert.equal(emptyTextFits({ height: 514 }), true);
  assert.equal(emptyTextFits({ height: 400 }), true);
  assert.equal(emptyTextFits({ height: 399 }), false);
  assert.equal(emptyTextFits({ height: 0 }), false);
});

// Stage area heights seen in the browser: 1440x900 about 827 px, 390x844 with
// the drawer collapsed about 690 px, with the drawer open about 109 px.
test('previewMarks: caption and rulers only when the stage area is 200 px or taller', () => {
  assert.equal(PREVIEW_MARKS_MIN_PX, 200);
  assert.equal(previewMarks(827), true);
  assert.equal(previewMarks(690), true);
  assert.equal(previewMarks(200), true);
  assert.equal(previewMarks(199), false);
  assert.equal(previewMarks(109), false);
  assert.equal(previewMarks(0), false);
});
