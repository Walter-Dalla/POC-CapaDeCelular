import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

const expected = {
  '--color-bg': '#102B26',
  '--color-stage': '#173A33',
  '--color-surface': '#1E4A41',
  '--color-brand': '#24564C',
  '--color-card': '#28594F',
  '--color-border': '#3B7266',
  '--color-border-strong': '#5C9486',
  '--color-text': '#FFFFFF',
  '--color-text-2': '#D3E4DF',
  '--color-text-3': '#B5D0C9',
  '--color-accent': '#FFB52E',
  '--color-on-accent': '#1B1300',
  '--color-accent-focus': '#FFC95E',
  '--color-select': '#FF5CA8',
  '--color-on-select': '#2A0A1A',
  '--color-guide': '#7DB8FF',
  '--color-warn': '#FFD447',
  '--color-warn-bg': '#3A3413',
  '--color-warn-text': '#FFE58A',
  '--color-danger': '#FF9B8A',
  '--color-danger-bg': '#3D1D18',
  '--color-danger-text': '#FFD2CA',
  '--color-danger-soft': '#FFB3A6',
  '--color-info-text': '#CFE4FF',
  '--color-line': '#2B5C52',
  '--color-inset': '#1A4239',
  '--color-stage-dot': '#245248',
  '--color-switch-off': '#8FB8AD',
  '--color-on-cover-2': '#3F5F58',
  '--brand-purple': '#6B2FA0',
  '--brand-gradient': 'linear-gradient(135deg, #F7941D, #E0218A 45%, #6B2FA0 75%, #2D7FF9)',
  '--space-4': '4px',
  '--space-8': '8px',
  '--space-12': '12px',
  '--space-16': '16px',
  '--space-20': '20px',
  '--space-24': '24px',
  '--space-40': '40px',
  '--radius-thumb': '8px',
  '--radius-icon': '10px',
  '--radius-field': '12px',
  '--radius-card': '14px',
  '--radius-drawer': '20px',
  '--radius-pill': '999px',
  '--shadow-cover': '0 24px 60px rgba(0, 0, 0, 0.45)',
  '--shadow-notice': '0 8px 24px rgba(0, 0, 0, 0.4)',
  '--shadow-drawer': '0 -10px 30px rgba(0, 0, 0, 0.35)',
  '--color-backdrop': 'rgba(0, 0, 0, 0.6)',
  '--touch-min': '44px',
  '--font-title': 'Fredoka, system-ui, sans-serif',
  '--font-text': "'Nunito Sans', system-ui, sans-serif",
  '--font-label': 'Silkscreen, ui-monospace, monospace',
};

const normalize = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

const declarations = [...withoutComments.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map(
  ([, name, value]) => ({ name, value }),
);

test('tokens.css has a single :root block with color-scheme dark', () => {
  assert.equal(withoutComments.match(/:root\s*\{/g)?.length, 1);
  assert.match(withoutComments, /color-scheme\s*:\s*dark\s*;/);
});

test('every token of the list is declared once', () => {
  for (const name of Object.keys(expected)) {
    const count = declarations.filter((d) => d.name === name).length;
    assert.equal(count, 1, `${name} declared ${count} times`);
  }
});

test('every token has the value of the list', () => {
  for (const [name, value] of Object.entries(expected)) {
    const found = declarations.find((d) => d.name === name);
    assert.ok(found, `${name} missing`);
    assert.equal(normalize(found.value), normalize(value), name);
  }
});
