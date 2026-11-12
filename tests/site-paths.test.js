// The site is served under a sub-path of GitHub Pages, so every path it uses
// must be relative and every module it imports must exist. The site also
// talks to the network only to read its own catalogue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function listFiles(dir, extension) {
  const found = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...listFiles(path, extension));
    else if (name.endsWith(extension)) found.push(path);
  }
  return found;
}

function read(path) {
  return { path, name: relative(root, path), text: readFileSync(path, 'utf8') };
}

const html = read(join(root, 'index.html'));
const scripts = listFiles(join(root, 'js'), '.js').map(read);
const styles = listFiles(join(root, 'css'), '.css').map(read);
const all = [html, ...scripts, ...styles];

const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

function matchAll(text, regex) {
  return [...text.matchAll(regex)].map((m) => m[1]);
}

// Module specifiers: static imports, re-exports, side-effect and dynamic imports.
function importSpecifiers(text) {
  return [
    ...matchAll(text, /^\s*(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/gm),
    ...matchAll(text, /^\s*import\s*['"]([^'"]+)['"]/gm),
    ...matchAll(text, /\bimport\(\s*['"`]([^'"`]+)['"`]/g),
  ];
}

// href, src, fetch and CSS url()/@import paths written as literals.
function literalPaths(text) {
  return [
    ...matchAll(text, /\b(?:href|src)\s*=\s*["'`]([^"'`]*)["'`]/g),
    ...matchAll(text, /setAttribute\(\s*['"](?:href|src)['"]\s*,\s*['"`]([^'"`]*)['"`]/g),
    ...matchAll(text, /\bfetch\(\s*['"`]([^'"`]*)['"`]/g),
    ...matchAll(text, /\burl\(\s*['"]?([^'")]*)['"]?\s*\)/g),
    ...matchAll(text, /@import\s+['"]([^'"]+)['"]/g),
  ];
}

function isAbsolute(path) {
  return path.startsWith('/') || /^http/i.test(path);
}

test('no file names the old published host', () => {
  for (const file of all) {
    assert.ok(!file.text.includes('walter-dalla.github.io'), `${file.name} cites walter-dalla.github.io`);
  }
});

test('href, src, fetch and url paths are relative', () => {
  for (const file of all) {
    for (const path of literalPaths(file.text)) {
      if (file === html && FONT_HOSTS.some((host) => path.startsWith(`${host}/`) || path === host)) continue;
      assert.ok(!isAbsolute(path), `${file.name}: absolute path ${path}`);
    }
  }
});

test('the page links only files that exist', () => {
  for (const path of literalPaths(html.text)) {
    if (isAbsolute(path) || path.startsWith('#') || path.startsWith('data:')) continue;
    assert.ok(existsSync(resolve(root, path)), `index.html: ${path} does not exist`);
  }
});

test('imports are relative and point to existing files', () => {
  const specifiers = scripts.flatMap((file) => importSpecifiers(file.text).map((spec) => ({ file, spec })));
  assert.ok(specifiers.length > 0, 'no import found under js/');
  for (const { file, spec } of specifiers) {
    assert.ok(spec.startsWith('./') || spec.startsWith('../'), `${file.name}: import ${spec} is not relative`);
    assert.ok(existsSync(resolve(dirname(file.path), spec)), `${file.name}: import ${spec} does not exist`);
  }
});

test('the only network call is the catalogue fetch', () => {
  const fetches = [];
  for (const file of [html, ...scripts]) {
    for (const api of ['XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource']) {
      assert.ok(!file.text.includes(api), `${file.name} uses ${api}`);
    }
    for (const _ of file.text.matchAll(/\bfetch\s*\(/g)) fetches.push(file.name);
  }
  assert.deepEqual(fetches, [join('js', 'catalog.js')]);
});

// Selectors of every rule of a stylesheet, comments removed.
function selectors(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return matchAll(text, /([^{}]+)\{/g).flatMap((list) => list.split(',').map((s) => s.trim()));
}

test('the panel footer rule lives in the shell stylesheet', () => {
  const layout = styles.find((file) => file.name === join('css', 'layout.css'));
  assert.ok(layout, 'css/layout.css missing');
  assert.ok(selectors(layout.text).includes('.panel__footer'), 'css/layout.css has no .panel__footer rule');
  const panels = styles.filter((file) => /^panel-.*\.css$/.test(basename(file.path)));
  assert.ok(panels.length > 0, 'no css/panel-*.css found');
  for (const file of panels) {
    assert.ok(!selectors(file.text).includes('.panel__footer'), `${file.name} defines .panel__footer`);
  }
});
