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
