import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../css/layout.css', import.meta.url), 'utf8');

// Body of the @media block that starts at the given query (balanced braces).
function mediaBlock(css, query) {
  const start = css.indexOf(`@media ${query}`);
  assert.ok(start >= 0, `@media ${query}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  assert.fail(`unclosed @media ${query}`);
}

// Declarations of a rule inside a block, by exact selector.
function ruleIn(block, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`(?:^|\\n|,)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `rule ${selector}`);
  return match[1];
}

const mobile = mediaBlock(layout, '(max-width: 899px)');

test('mobile rules live in a max-width: 899px query and desktop ones in min-width: 900px', () => {
  assert.ok(mobile.length > 0);
  assert.ok(mediaBlock(layout, '(min-width: 900px)').length > 0);
});

test('compact header: 60px high, padding 0 16px, brand at 20px, no subtitle or privacy line', () => {
  const header = ruleIn(mobile, '.app-header');
  assert.match(header, /height: 60px;/);
  assert.match(header, /padding: 0 var\(--space-16\);/);
  assert.match(ruleIn(mobile, '.brand__name'), /font-size: 20px;/);
  assert.match(mobile, /\.app-header__title,[^{]*\.app-header__privacy,[^{]*\{\s*display: none;/);
  assert.match(mobile, /\.model-chip__size\s*\{\s*display: none;/);
  assert.match(ruleIn(mobile, '.app-header__new'), /width: var\(--touch-min\);/);
});

test('toolbar shows icons only and hides the readout', () => {
  assert.match(mobile, /\.stage-tool__label\s*\{[^}]*clip-path: inset\(50%\);/);
  assert.match(mobile, /\.stage-readout\s*\{\s*display: none;/);
});

test('drawer: top radius, top border, upward shadow, handle bar', () => {
  const panel = ruleIn(mobile, '.panel');
  assert.match(panel, /border-top: 1px solid var\(--color-border\);/);
  assert.match(panel, /border-radius: var\(--radius-drawer\) var\(--radius-drawer\) 0 0;/);
  assert.match(panel, /box-shadow: var\(--shadow-drawer\);/);
  const handle = ruleIn(mobile, '.drawer-handle');
  assert.match(handle, /height: var\(--touch-min\);/);
  const bar = ruleIn(mobile, '.drawer-handle::before');
  assert.match(bar, /width: 44px;/);
  assert.match(bar, /height: 5px;/);
  assert.match(bar, /background: var\(--color-border-strong\);/);
  const tab = ruleIn(mobile, '.panel .tab');
  assert.match(tab, /min-height: 48px;/);
  assert.match(tab, /font-size: 15px;/);
});

test('collapsed drawer shows only .panel__compact; open drawer is capped at 80% of the viewport', () => {
  assert.match(
    mobile,
    /\.panel:not\(\.drawer--open\) \.panel__body > :not\(\.panel__compact\)\s*\{\s*display: none;/,
  );
  const open = ruleIn(mobile, '.panel.drawer--open');
  assert.match(open, /max-height: 80vh;/);
  assert.match(open, /max-height: 80dvh;/);
});

test('floating notices sit 12px from the stage edges', () => {
  const notices = ruleIn(mobile, '.notices');
  assert.match(notices, /left: var\(--space-12\);/);
  assert.match(notices, /right: var\(--space-12\);/);
  assert.match(notices, /bottom: var\(--space-12\);/);
});

test('the drawer handle is the first child of the panel, collapsed', () => {
  assert.match(html, /<aside id="panel" class="panel" aria-label="Painel">\s*<button id="drawer-handle"/);
  const handle = html.match(/<button id="drawer-handle"[^>]*>/)[0];
  assert.match(handle, /type="button"/);
  assert.match(handle, /aria-expanded="false"/);
  assert.match(handle, /aria-label="Expandir painel"/);
});
