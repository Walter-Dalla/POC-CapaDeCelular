import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  body,
}));

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const rulesFor = (selector) => {
  const pattern = new RegExp(`${escape(selector)}(?![\\w-])`);
  return rules.filter((rule) => pattern.test(rule.selector));
};

const valueOf = (selector, property) => {
  let value;
  for (const rule of rules) {
    const selectors = rule.selector.split(',').map((part) => part.trim().replace(/\s+/g, ' '));
    if (!selectors.includes(selector)) continue;
    for (const [, name, declared] of rule.body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
      if (name === property) value = declared.trim().replace(/\s+/g, ' ');
    }
  }
  return value;
};

const expectedValues = [
  ['.tabs', 'display', 'grid'],
  ['.tabs', 'grid-template-columns', 'repeat(3, minmax(0, 1fr))'],
  ['.tabs', 'border-bottom', '1px solid var(--color-border)'],
  ['.tab', 'min-height', '56px'],
  ['.tab', 'font-family', 'var(--font-title)'],
  ['.tab', 'font-weight', '500'],
  ['.tab', 'font-size', '16px'],
  ['.tab', 'color', 'var(--color-text-2)'],
  ['.tab', 'border-bottom', '3px solid transparent'],
  ['.tab[aria-selected="true"]', 'color', 'var(--color-text)'],
  ['.tab[aria-selected="true"]', 'font-weight', '600'],
  ['.tab[aria-selected="true"]', 'border-bottom-color', 'var(--color-accent)'],
  ['.tab__step', 'font-family', 'var(--font-label)'],
  ['.tab__step', 'font-size', '12px'],
  ['.tab__step', 'color', 'var(--color-text-3)'],
  ['.tab[aria-selected="true"] .tab__step', 'color', 'var(--color-accent)'],
  ['.card', 'border-radius', 'var(--radius-card)'],
  ['.card', 'background', 'var(--color-card)'],
  ['.card', 'border', '2px solid transparent'],
  ['.card--selected', 'border-color', 'var(--color-accent)'],
  ['.card--layer-selected', 'border-color', 'var(--color-select)'],
  ['.inset', 'border-radius', 'var(--radius-card)'],
  ['.inset', 'border', '1px solid var(--color-border)'],
  ['.inset', 'background', 'var(--color-inset)'],
  ['.inset', 'padding', 'var(--space-16)'],
  ['.badge--approx', 'border-radius', 'var(--radius-pill)'],
  ['.badge--approx', 'border', '1px solid var(--color-warn)'],
  ['.badge--approx', 'color', 'var(--color-warn-text)'],
  ['.badge--approx', 'font-size', '12px'],
  ['.badge--approx', 'font-weight', '700'],
  ['.badge--selected', 'background', 'var(--color-select)'],
  ['.badge--selected', 'color', 'var(--color-on-select)'],
  ['.notice', 'display', 'flex'],
  ['.notice', 'gap', '10px'],
  ['.notice', 'padding', '10px 12px'],
  ['.notice', 'border-radius', 'var(--radius-icon)'],
  ['.notice', 'font-size', '13px'],
  ['.notice--warn', 'background', 'var(--color-warn-bg)'],
  ['.notice--warn', 'border-color', 'var(--color-warn)'],
  ['.notice--warn', 'color', 'var(--color-warn-text)'],
  ['.notice--error', 'background', 'var(--color-danger-bg)'],
  ['.notice--error', 'border-color', 'var(--color-danger)'],
  ['.notice--error', 'color', 'var(--color-danger-text)'],
  ['.notice--info', 'background', 'var(--color-stage)'],
  ['.notice--info', 'border-color', 'var(--color-guide)'],
  ['.notice--info', 'color', 'var(--color-info-text)'],
  ['.notice--floating', 'border-radius', 'var(--radius-field)'],
  ['.notice--floating', 'box-shadow', 'var(--shadow-notice)'],
  ['.notice__close', 'width', 'var(--touch-min)'],
  ['.notice__close', 'height', 'var(--touch-min)'],
  ['.label-caps', 'font-family', 'var(--font-label)'],
  ['.label-caps', 'font-size', '12px'],
  ['.label-caps', 'letter-spacing', '2px'],
  ['.label-caps', 'color', 'var(--color-text-3)'],
  ['.title', 'font-family', 'var(--font-title)'],
  ['.title', 'font-weight', '600'],
  ['.title', 'font-size', '17px'],
  ['.support', 'font-size', '13px'],
  ['.support', 'color', 'var(--color-text-3)'],
  ['.brand', 'display', 'flex'],
  ['.brand', 'flex-direction', 'column'],
  ['.brand', 'align-items', 'center'],
  ['.brand__name', 'font-family', 'var(--font-title)'],
  ['.brand__name', 'font-weight', '700'],
  ['.brand__name', 'font-size', '26px'],
  ['.brand__mark', 'width', '22px'],
  ['.brand__mark', 'height', '22px'],
  ['.brand__mark', 'border', '3px solid var(--color-text)'],
  ['.brand__mark', 'background', 'var(--brand-gradient)'],
  ['.brand__sub', 'font-family', 'var(--font-label)'],
  ['.brand__sub', 'font-size', '11px'],
  ['.brand__sub', 'letter-spacing', '3px'],
  ['.dialog', 'background', 'var(--color-surface)'],
  ['.dialog', 'border-radius', 'var(--radius-card)'],
  ['.dialog', 'border', '1px solid var(--color-border)'],
  ['.dialog', 'padding', 'var(--space-24)'],
  ['.dialog', 'max-width', '400px'],
  ['.dialog::backdrop', 'background', 'var(--color-backdrop)'],
];

test('every surface declares the values of the design', () => {
  for (const [selector, property, value] of expectedValues) {
    assert.equal(valueOf(selector, property), value, `${selector} ${property}`);
  }
});

const classes = [
  '.tabs',
  '.tab',
  '.tab__step',
  '.card',
  '.card--selected',
  '.card--layer-selected',
  '.inset',
  '.badge--approx',
  '.badge--selected',
  '.notice',
  '.notice--warn',
  '.notice--error',
  '.notice--info',
  '.notice--floating',
  '.notice__close',
  '.label-caps',
  '.title',
  '.support',
  '.brand',
  '.brand__name',
  '.brand__mark',
  '.brand__sub',
  '.dialog',
];

test('every surface class has a rule', () => {
  for (const name of classes) {
    assert.ok(rulesFor(name).length > 0, `no rule for ${name}`);
  }
});

test('the selected tab and its step have a rule', () => {
  const selected = rulesFor('.tab[aria-selected="true"]');
  const body = selected.map((rule) => rule.body).join('');
  assert.match(body, /border-bottom-color:\s*var\(--color-accent\);/);
  assert.ok(rulesFor('.tab[aria-selected="true"] .tab__step').length > 0, 'no selected step rule');
});

test('the floating notice carries the notice shadow', () => {
  const body = rulesFor('.notice--floating').map((rule) => rule.body).join('');
  assert.match(body, /box-shadow:\s*var\(--shadow-notice\);/);
});

test('the brand mark uses the brand gradient', () => {
  const body = rulesFor('.brand__mark').map((rule) => rule.body).join('');
  assert.match(body, /background:\s*var\(--brand-gradient\);/);
});

test('the dialog backdrop uses the backdrop colour', () => {
  const body = rulesFor('.dialog::backdrop').map((rule) => rule.body).join('');
  assert.match(body, /background:\s*var\(--color-backdrop\);/);
});

test('app.css has no colour literal outside comments', () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /rgba?\(/i);
});
