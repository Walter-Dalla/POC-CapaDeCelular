import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../css/layout.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');

// Opening tag of the element with the given id.
function tagOf(id) {
  const matches = [...html.matchAll(new RegExp(`<[a-z0-9]+\\b[^>]*\\bid="${id}"[^>]*>`, 'g'))];
  assert.equal(matches.length, 1, `exactly one element with id="${id}"`);
  return matches[0][0];
}

// Block of a CSS rule whose selector list is exactly the given one.
function ruleOf(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `rule ${selector}`);
  return match[1];
}

const ids = [
  'model-chip', 'model-chip-name', 'model-chip-size', 'btn-new-project',
  'stage', 'stage-toolbar', 'btn-undo', 'btn-redo', 'btn-fill', 'btn-fit', 'btn-centre',
  'btn-safe-margin', 'stage-readout',
  'crop-bar', 'btn-crop-apply', 'btn-crop-cancel', 'btn-crop-reset',
  'stage-caption', 'stage-canvas', 'stage-empty', 'btn-empty-add', 'stage-legend', 'notices',
  'tab-model', 'tab-images', 'tab-export', 'panel-model', 'panel-images', 'panel-export',
  'file-input', 'dialog-confirm', 'dialog-title', 'dialog-text', 'dialog-cancel', 'dialog-ok',
];

test('every id of the shell exists exactly once', () => {
  for (const id of ids) tagOf(id);
});

test('header: brand, title, privacy line, new project and model chip', () => {
  assert.match(html, /<div class="brand" role="img" aria-label="Leonel Games">/);
  assert.ok(html.includes('<div class="brand__name">LE<span class="brand__mark"></span>NEL</div>'));
  assert.ok(html.includes('<div class="brand__sub">GAMES</div>'));
  assert.ok(html.includes('>Estúdio de capas<'));
  assert.ok(html.includes('<span>Suas imagens não saem deste aparelho</span>'));
  const newProject = tagOf('btn-new-project');
  assert.match(newProject, /^<button /);
  assert.match(newProject, /class="btn btn--secondary/);
  assert.match(newProject, /aria-label="Novo projeto"/);
  assert.ok(html.includes('<span class="app-header__new-label">Novo projeto</span>'));
  assert.match(tagOf('model-chip'), /^<button /);
  assert.ok(html.includes('<span id="model-chip-name" class="model-chip__name">iPhone 15</span>'));
  assert.ok(html.includes('<span id="model-chip-size" class="model-chip__size">71,6 × 147,6 mm</span>'));
});

test('stage is a focusable group labelled Palco', () => {
  assert.equal(tagOf('stage'), '<main id="stage" class="stage" tabindex="0" role="group" aria-label="Palco">');
});

test('stage toolbar: buttons, labels and the safe-margin toggle', () => {
  assert.match(tagOf('btn-undo'), /aria-label="Desfazer"/);
  assert.match(tagOf('btn-redo'), /aria-label="Refazer"/);
  assert.ok(html.includes('<span class="stage-tool__label">Preencher</span>'));
  assert.ok(html.includes('<span class="stage-tool__label">Caber</span>'));
  assert.ok(html.includes('<span class="stage-tool__label">Centralizar</span>'));
  const margin = tagOf('btn-safe-margin');
  assert.match(margin, /aria-pressed="true"/);
  assert.match(margin, /aria-label="Margem de segurança"/);
  const toolbar = html.slice(html.indexOf('id="stage-toolbar"'), html.indexOf('id="crop-bar"'));
  for (const id of ['btn-undo', 'btn-redo', 'btn-fill', 'btn-fit', 'btn-centre', 'btn-safe-margin', 'stage-readout']) {
    assert.ok(toolbar.includes(`id="${id}"`), `${id} inside the toolbar`);
  }
});

test('crop bar: hidden, text and three buttons', () => {
  assert.match(tagOf('crop-bar'), /\shidden>$/);
  assert.ok(html.includes('>Arraste os cantos para escolher a parte da imagem que fica na capa.<'));
  assert.equal(tagOf('btn-crop-reset'), '<button id="btn-crop-reset" type="button" class="btn btn--ghost">');
  assert.equal(tagOf('btn-crop-cancel'), '<button id="btn-crop-cancel" type="button" class="btn btn--secondary">');
  assert.equal(tagOf('btn-crop-apply'), '<button id="btn-crop-apply" type="button" class="btn btn--primary">');
  assert.ok(html.includes('class="btn btn--ghost">Imagem inteira</button>'));
  assert.ok(html.includes('class="btn btn--secondary">Cancelar</button>'));
  assert.ok(html.includes('class="btn btn--primary">Aplicar recorte</button>'));
});

test('caption hidden, canvas with role img, empty state texts', () => {
  assert.match(tagOf('stage-caption'), /\shidden>$/);
  const canvas = tagOf('stage-canvas');
  assert.match(canvas, /^<canvas /);
  assert.match(canvas, /role="img"/);
  assert.ok(html.includes('>PRESS START<'));
  assert.ok(html.includes('<h1 class="stage-empty__title">Sua capa começa aqui</h1>'));
  assert.ok(html.includes('<span class="stage-empty__step" aria-hidden="true">1</span>Escolha o modelo do celular</li>'));
  assert.ok(html.includes('<span class="stage-empty__step" aria-hidden="true">2</span>Adicione e posicione as imagens</li>'));
  assert.ok(html.includes('<span class="stage-empty__step" aria-hidden="true">3</span>Baixe o arquivo para impressão</li>'));
  assert.ok(html.includes('</svg>Adicionar imagens</button>'));
  assert.ok(html.includes('>ou solte os arquivos em qualquer lugar da tela<'));
  const empty = html.slice(html.indexOf('id="stage-empty"'), html.indexOf('id="stage-legend"'));
  assert.ok(empty.includes('id="btn-empty-add"'));
});

test('legend is an empty list, notices are a polite live region', () => {
  assert.match(html, /<ul id="stage-legend" class="stage-legend"><\/ul>/);
  assert.match(tagOf('notices'), /aria-live="polite"/);
});

test('tablist with three tabs and three tab panels', () => {
  assert.match(html, /<div class="tabs" role="tablist" aria-label="Etapas">/);
  const tabs = [
    ['model', '1', 'Modelo', 'true', '0'],
    ['images', '2', 'Imagens', 'false', '-1'],
    ['export', '3', 'Exportar', 'false', '-1'],
  ];
  for (const [name, step, label, selected, tabindex] of tabs) {
    assert.equal(
      tagOf(`tab-${name}`),
      `<button id="tab-${name}" type="button" class="tab" role="tab" aria-controls="panel-${name}" aria-selected="${selected}" tabindex="${tabindex}">`,
    );
    assert.ok(html.includes(`<span class="tab__step">${step}</span>${label}</button>`));
  }
  assert.equal(tagOf('panel-model'), '<section id="panel-model" class="panel__body" role="tabpanel" aria-labelledby="tab-model">');
  assert.equal(tagOf('panel-images'), '<section id="panel-images" class="panel__body" role="tabpanel" aria-labelledby="tab-images" hidden>');
  assert.equal(tagOf('panel-export'), '<section id="panel-export" class="panel__body" role="tabpanel" aria-labelledby="tab-export" hidden>');
  for (const name of ['model', 'images', 'export']) {
    assert.match(html, new RegExp(`id="panel-${name}"[^>]*></section>`), `panel-${name} is empty`);
  }
});

test('file input and confirmation dialog', () => {
  const input = tagOf('file-input');
  assert.match(input, /type="file"/);
  assert.match(input, /\smultiple\s/);
  assert.match(input, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(input, /class="visually-hidden"/);
  assert.match(tagOf('dialog-confirm'), /^<dialog id="dialog-confirm" class="dialog"/);
  assert.ok(html.includes('class="btn btn--secondary">Cancelar</button>'));
  assert.match(tagOf('dialog-cancel'), /^<button /);
  assert.match(tagOf('dialog-ok'), /^<button /);
});

test('layout: header, stage, panel side by side from 900px', () => {
  const header = ruleOf(layout, '.app-header');
  assert.match(header, /padding: var\(--space-12\) var\(--space-24\);/);
  assert.match(header, /border-bottom: 1px solid var\(--color-line\);/);
  const title = ruleOf(layout, '.app-header__title');
  assert.match(title, /font-family: var\(--font-title\);/);
  assert.match(title, /font-weight: 500;/);
  assert.match(title, /font-size: 18px;/);
  assert.match(title, /color: var\(--color-text-2\);/);
  assert.match(title, /flex-grow: 1;/);
  const stage = ruleOf(layout, '.stage');
  assert.match(stage, /background-color: var\(--color-stage\);/);
  assert.match(stage, /background-image: radial-gradient\(var\(--color-stage-dot\) 1\.5px, transparent 1\.5px\);/);
  assert.match(stage, /background-size: 24px 24px;/);
  assert.match(ruleOf(layout, '.app'), /height: 100dvh;/);
  assert.match(ruleOf(layout, '.panel__body'), /overflow-y: auto;/);
  const desktop = layout.slice(layout.indexOf('@media (min-width: 900px)'));
  assert.ok(desktop.length > 0);
  assert.match(desktop, /\.workspace \{\s*flex-direction: row;\s*\}/);
  assert.match(desktop, /\.panel \{[^}]*width: 400px;[^}]*border-left: 1px solid var\(--color-line\);/);
  assert.match(ruleOf(layout, '.panel'), /background: var\(--color-surface\);/);
  assert.match(ruleOf(layout, '[hidden]'), /display: none !important;/);
});

test('empty state: text for a white cover, with a dark-cover modifier', () => {
  assert.match(ruleOf(layout, '.stage-empty'), /color: var\(--color-bg\);/);
  assert.doesNotMatch(ruleOf(layout, '.stage-empty'), /background/);
  assert.match(ruleOf(layout, '.stage-empty__kicker'), /color: var\(--color-brand\);/);
  assert.match(ruleOf(layout, '.stage-empty__hint'), /color: var\(--color-on-cover-2\);/);
  assert.match(ruleOf(layout, '.stage-empty--on-dark'), /color: var\(--color-text\);/);
  assert.match(
    layout,
    /\.stage-empty--on-dark \.stage-empty__kicker,\s*\.stage-empty--on-dark \.stage-empty__hint\s*\{\s*color: var\(--color-text-2\);/,
  );
});

test('layout uses no colour literal', () => {
  assert.doesNotMatch(layout, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(layout, /rgba?\(/);
});

test('links hover in the warn colour', () => {
  assert.match(ruleOf(app, 'a:hover'), /color: var\(--color-warn\);/);
});
