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
