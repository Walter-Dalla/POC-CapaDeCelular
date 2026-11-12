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
  ['.btn--primary', 'min-height', '52px'],
  ['.btn--primary', 'border-radius', 'var(--radius-card)'],
  ['.btn--primary', 'background', 'var(--color-accent)'],
  ['.btn--primary', 'color', 'var(--color-on-accent)'],
  ['.btn--primary', 'font-family', 'var(--font-title)'],
  ['.btn--primary', 'font-weight', '600'],
  ['.btn--primary', 'font-size', '17px'],
  ['.btn--primary:hover', 'background', 'var(--color-accent-focus)'],
  ['.btn--primary:focus-visible', 'background', 'var(--color-accent-focus)'],
  ['.btn--secondary', 'min-height', 'var(--touch-min)'],
  ['.btn--secondary', 'border', '1px solid var(--color-text)'],
  ['.btn--secondary', 'border-radius', 'var(--radius-field)'],
  ['.btn--secondary', 'font-weight', '700'],
  ['.btn--icon', 'width', 'var(--touch-min)'],
  ['.btn--icon', 'height', 'var(--touch-min)'],
  ['.btn--icon', 'border', '1px solid var(--color-border-strong)'],
  ['.btn--icon', 'border-radius', 'var(--radius-icon)'],
  ['.btn--icon.btn--danger', 'color', 'var(--color-danger-soft)'],
  ['.btn--ghost', 'border', '0'],
  ['.btn--ghost', 'color', 'var(--color-text-2)'],
  ['.btn--ghost', 'height', 'var(--touch-min)'],
  ['.btn--ghost', 'font-weight', '600'],
  ['.btn:disabled', 'background', 'var(--color-border)'],
  ['.btn:disabled', 'color', 'var(--color-text-2)'],
  ['.btn:disabled', 'cursor', 'default'],
  ['.field', 'display', 'flex'],
  ['.field', 'flex-direction', 'column'],
  ['.field', 'gap', 'var(--space-4)'],
  ['.field__label', 'font-size', '13px'],
  ['.field__label', 'font-weight', '700'],
  ['.field__input', 'height', 'var(--touch-min)'],
  ['.field__input', 'border', '1px solid var(--color-border-strong)'],
  ['.field__input', 'border-radius', 'var(--radius-icon)'],
  ['.field__input', 'background', 'var(--color-stage)'],
  ['.field__input[aria-invalid="true"]', 'border', '2px solid var(--color-danger)'],
  ['.field__error', 'font-size', '13px'],
  ['.field__error', 'color', 'var(--color-danger-soft)'],
  ['.search', 'height', '48px'],
  ['.search', 'border', '1px solid var(--color-border-strong)'],
  ['.search', 'background', 'var(--color-stage)'],
  ['.segmented', 'display', 'grid'],
  ['.segmented', 'padding', 'var(--space-4)'],
  ['.segmented', 'border-radius', 'var(--radius-field)'],
  ['.segmented', 'background', 'var(--color-stage)'],
  ['.segmented', 'border', '1px solid var(--color-border)'],
  ['.segmented button[aria-pressed="true"]', 'background', 'var(--color-text)'],
  ['.segmented button[aria-pressed="true"]', 'color', 'var(--color-bg)'],
  ['.switch', 'width', '52px'],
  ['.switch', 'height', 'var(--touch-min)'],
  ['.switch::before', 'width', '52px'],
  ['.switch::before', 'height', '28px'],
  ['.switch::before', 'background', 'var(--color-stage)'],
  ['.switch::before', 'border', '1px solid var(--color-switch-off)'],
  ['.switch::after', 'width', '22px'],
  ['.switch::after', 'height', '22px'],
  ['.switch::after', 'background', 'var(--color-text)'],
  ['.switch[aria-checked="true"]::before', 'background', 'var(--color-accent)'],
  ['.switch[aria-checked="true"]::after', 'background', 'var(--color-on-accent)'],
  ['.chip', 'height', 'var(--touch-min)'],
  ['.chip', 'border-radius', 'var(--radius-pill)'],
  ['.chip[aria-pressed="true"]', 'background', 'var(--color-text)'],
  ['.swatch', 'width', 'var(--touch-min)'],
  ['.swatch', 'height', 'var(--touch-min)'],
  ['.swatch', 'border-radius', 'var(--radius-field)'],
  ['.swatch[aria-pressed="true"]', 'border', '3px solid var(--color-accent)'],
];

test('every control declares the values of the design', () => {
  for (const [selector, property, value] of expectedValues) {
    assert.equal(valueOf(selector, property), value, `${selector} ${property}`);
  }
});

const classes = [
  '.btn',
  '.btn--primary',
  '.btn--secondary',
  '.btn--icon',
  '.btn--icon.btn--danger',
  '.btn--ghost',
  '.field',
  '.field__label',
  '.field__input',
  '.field__error',
  '.search',
  '.segmented',
  '.switch',
  '.chip',
  '.swatch',
  '.visually-hidden',
];

const states = [
  '.btn--primary:hover',
  '.btn--primary:focus-visible',
  '.btn:disabled',
  '.field__input[aria-invalid="true"]',
  '.segmented button[aria-pressed="true"]',
  '.switch[aria-checked="true"]',
  '.chip[aria-pressed="true"]',
  '.swatch[aria-pressed="true"]',
];

test('every control class has a rule', () => {
  for (const name of classes) {
    assert.ok(rulesFor(name).length > 0, `no rule for ${name}`);
  }
});

test('every control state has a rule', () => {
  for (const selector of states) {
    assert.ok(rulesFor(selector).length > 0, `no rule for ${selector}`);
  }
});

test('the base rules set body and links from the tokens', () => {
  const body = rules.find((rule) => rule.selector === 'body');
  assert.ok(body, 'no body rule');
  assert.match(body.body, /margin:\s*0;/);
  assert.match(body.body, /font-family:\s*var\(--font-text\);/);
  assert.match(body.body, /font-size:\s*15px;/);
  assert.match(body.body, /line-height:\s*1\.4;/);
  assert.match(body.body, /color:\s*var\(--color-text\);/);
  assert.match(body.body, /background:\s*var\(--color-bg\);/);
  const link = rules.find((rule) => rule.selector === 'a');
  assert.ok(link, 'no link rule');
  assert.match(link.body, /color:\s*var\(--color-accent\);/);
  assert.ok(rules.some((rule) => /box-sizing:\s*border-box;/.test(rule.body)), 'no box-sizing');
});

test(':focus-visible carries the 3px outline for every control', () => {
  const focus = rules.filter(
    (rule) =>
      rule.selector.includes(':focus-visible') &&
      /outline:\s*3px solid var\(--color-text\);/.test(rule.body) &&
      /outline-offset:\s*2px;/.test(rule.body),
  );
  assert.ok(focus.length > 0, 'no 3px focus outline');
  const selectors = focus.map((rule) => rule.selector).join(',');
  for (const name of ['.btn', '.field__input', '.segmented button', '.switch', '.chip', '.swatch']) {
    assert.ok(selectors.includes(`${name}:focus-visible`), `${name} without focus outline`);
  }
});

test('app.css has no colour literal outside comments', () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /rgba?\(/i);
});
