import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTabs, drawerOpen } from '../js/main.js';
import {
  contrastStrokes,
  cutLineStrokes,
  emptyParts,
  emptyRoom,
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

// 7 buttons of 44px and 6 gaps of 4px (the spacer hidden, Remover pushed by
// its auto margin) take 332px; the row of the 400px panel with the 15px
// scrollbar gutter is 400 - 1 (panel border) - 15 (gutter) - 2 × 16 (panel
// padding) - 2 × 2 (selected card border) - 2 × 8 (card padding) = 332px.
test('panel-images.css: from 900px the layer actions keep one row with a 4px gap', () => {
  const css = readFileSync(new URL('../css/panel-images.css', import.meta.url), 'utf8');
  const media = /@media \(min-width: 900px\) \{([\s\S]*?)\n\}/.exec(css);
  assert.ok(media, 'desktop media block');
  assert.match(media[1], /\.layer-card__actions \{[^}]*flex-wrap: nowrap;[^}]*gap: var\(--space-4\);/);
  assert.match(media[1], /\.layer-card \{[^}]*padding-inline: var\(--space-8\);/);
  assert.ok(7 * 44 + 6 * 4 <= 400 - 1 - 15 - 2 * 16 - 2 * 2 - 2 * 8);
  // The 390px compact card keeps its own 4px gap.
  assert.match(css, /\.layer-card--compact \.layer-card__actions \{[^}]*gap: var\(--space-4\);/);
});

test('panel-images.css: from 900px the row keeps fitting when the panel scrolls', () => {
  const css = readFileSync(new URL('../css/panel-images.css', import.meta.url), 'utf8');
  const media = /@media \(min-width: 900px\) \{([\s\S]*?)\n\}/.exec(css)[1];
  assert.match(media, /#panel-images \{[^}]*scrollbar-gutter: stable;/);
  assert.match(media, /\.panel-images \{[^}]*padding-inline: var\(--space-16\);/);
  assert.match(media, /\.layer-card__spacer \{[^}]*display: none;/);
  assert.match(media, /\.layer-card__actions > \.btn--danger \{[^}]*margin-left: auto;/);
  assert.match(media, /\.layer-card__actions > \.btn--icon \{[^}]*flex-shrink: 1;[^}]*min-width: 40px;/);
  // A 17px scrollbar leaves 330px: the buttons shrink to (330 - 24) / 7 px, above the 40px floor.
  assert.ok((330 - 6 * 4) / 7 >= 40);
  // The hidden inputs of the panel are placed inside it, not against the page.
  assert.match(css, /\n#panel-images \{[^}]*position: relative;/);
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

// Part heights measured at 390 px wide (12 px gap): all five take
// 17 + 64 + 142 + 48 + 36 + 4 × 12 = 355 px.
const MOBILE_PARTS = { kicker: 17, title: 64, steps: 142, add: 48, hint: 36 };

test('emptyRoom: below the cutout padding (or 40 px) down to 12 px above the bottom', () => {
  assert.equal(emptyRoom({ height: 514, paddingTop: 144 }), 358);
  assert.equal(emptyRoom({ height: 300, paddingTop: null }), 248);
  assert.equal(emptyRoom({ height: 0, paddingTop: 12 }), 0);
});

test('emptyParts: every part when they all fit', () => {
  assert.deepEqual(emptyParts(358, MOBILE_PARTS, 12), ['kicker', 'title', 'steps', 'add', 'hint']);
  assert.deepEqual(emptyParts(355, MOBILE_PARTS, 12), ['kicker', 'title', 'steps', 'add', 'hint']);
});

test('emptyParts: drops the last line, then the steps, then the title, never the button', () => {
  // 355 - 36 - 12 = 307
  assert.deepEqual(emptyParts(354, MOBILE_PARTS, 12), ['kicker', 'title', 'steps', 'add']);
  assert.deepEqual(emptyParts(307, MOBILE_PARTS, 12), ['kicker', 'title', 'steps', 'add']);
  // 307 - 142 - 12 = 153
  assert.deepEqual(emptyParts(306, MOBILE_PARTS, 12), ['kicker', 'title', 'add']);
  assert.deepEqual(emptyParts(153, MOBILE_PARTS, 12), ['kicker', 'title', 'add']);
  // 153 - 64 - 12 = 77
  assert.deepEqual(emptyParts(152, MOBILE_PARTS, 12), ['kicker', 'add']);
  assert.deepEqual(emptyParts(77, MOBILE_PARTS, 12), ['kicker', 'add']);
  // 77 - 17 - 12 = 48: the button alone
  assert.deepEqual(emptyParts(76, MOBILE_PARTS, 12), ['add']);
  assert.deepEqual(emptyParts(48, MOBILE_PARTS, 12), ['add']);
});

test('emptyParts: nothing when not even the button fits (open drawer, case about 0 px)', () => {
  assert.deepEqual(emptyParts(47, MOBILE_PARTS, 12), []);
  assert.deepEqual(emptyParts(0, MOBILE_PARTS, 12), []);
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
