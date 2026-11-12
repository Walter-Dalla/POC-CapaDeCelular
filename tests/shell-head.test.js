import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const favicon = readFileSync(new URL('../favicon.svg', import.meta.url), 'utf8');

const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

test('html element declares pt-BR', () => {
  assert.match(html, /<html lang="pt-BR">/);
});

test('charset and viewport', () => {
  assert.match(head, /<meta charset="utf-8">/);
  assert.ok(head.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
});

test('title, description and theme colour', () => {
  assert.ok(head.includes('<title>Leonel Games — Estúdio de capas</title>'));
  assert.ok(head.includes(
    '<meta name="description" content="Monte a arte da capa do seu celular e baixe o arquivo pronto para impressão. Suas imagens não saem deste aparelho.">'
  ));
  assert.ok(head.includes('<meta name="theme-color" content="#102B26">'));
});

test('favicon link', () => {
  assert.ok(head.includes('<link rel="icon" href="./favicon.svg" type="image/svg+xml">'));
});

test('Google Fonts link with its two preconnects', () => {
  assert.ok(head.includes('<link rel="preconnect" href="https://fonts.googleapis.com">'));
  assert.ok(head.includes('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'));
  assert.ok(head.includes(
    'href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&family=Silkscreen&display=swap"'
  ));
});

test('the six stylesheets in order', () => {
  const sheets = [...head.matchAll(/<link rel="stylesheet" href="(\.\/[^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(sheets, [
    './css/tokens.css',
    './css/app.css',
    './css/layout.css',
    './css/panel-model.css',
    './css/panel-images.css',
    './css/panel-export.css',
  ]);
});

test('a single module script pointing at js/main.js', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  assert.deepEqual(scripts, ['<script type="module" src="./js/main.js">']);
  assert.match(html, /<script type="module" src="\.\/js\/main\.js"><\/script>/);
});

test('content security policy', () => {
  assert.ok(head.includes(
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src \'self\'; img-src \'self\' blob: data:; style-src \'self\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com">'
  ));
});

test('no inline style or inline script', () => {
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});

test('favicon: white ring with the brand gradient on the background colour', () => {
  assert.match(favicon, /<rect[^>]*fill="#102B26"/);
  assert.match(favicon, /<circle[^>]*fill="url\(#brand\)"[^>]*stroke="#FFFFFF"/);
  const stops = [...favicon.matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(stops, [
    ['0', '#F7941D'],
    ['0.45', '#E0218A'],
    ['0.75', '#6B2FA0'],
    ['1', '#2D7FF9'],
  ]);
  assert.doesNotMatch(favicon, /style/);
});
