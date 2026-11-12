// The stage: the canvas that shows the cover in the edit view and in the
// file preview. It reads the state and draws; it handles no pointer input.
// Lengths of the state are in millimetres from the centre of the cover; they
// become screen pixels only here, through the scale of the stage layout.

import { traceCase, traceCutouts } from './geometry.js';
import { plural } from './format.js';

// Free space around the case on the stage, beyond the bleed, in mm.
const STAGE_ROOM_MM = 6;
// Space between the lowest top cutout and the empty-state text, in px.
const EMPTY_TEXT_GAP_PX = 12;
// Relative luminance under which the cover background counts as dark.
const DARK_LUMINANCE = 0.4;
const DEFAULT_SAFE_MARGIN_MM = 3;

// Scale (screen px per mm) and centre of the case on the stage box, so that
// the case plus marginMm on every side fits the box, centred.
export function stageLayout(boxWidth, boxHeight, model, marginMm) {
  const width = model.case.width + 2 * marginMm;
  const height = model.case.height + 2 * marginMm;
  const scale = Math.max(0, Math.min(boxWidth / width, boxHeight / height));
  return { scale, originX: boxWidth / 2, originY: boxHeight / 2 };
}

// Accessible name of the stage canvas.
export function stageLabel(model, layerCount) {
  if (layerCount === 0) return `Capa do ${model.name}, sem imagens`;
  return `Capa do ${model.name} com ${plural(layerCount, 'imagem', 'imagens')}`;
}

// What the stage shows: the file preview on the Exportar tab, else the edit
// view, which without layers is the empty cover.
export function stageView(state) {
  if (state.ui.tab === 'export') return 'preview';
  return state.project.layers.length === 0 ? 'empty' : 'edit';
}

// A length in mm as the legend writes it: '2', '2,5'.
function legendMm(n) {
  return String(n).replace('.', ',');
}

function safeMarginOf(model) {
  return model.safeMargin ?? DEFAULT_SAFE_MARGIN_MM;
}

// Legend entries of a view: the text and the kind of line sample beside it.
function legendEntries(view, model, ui) {
  const bleed = { text: `Sangria ${legendMm(model.bleed)} mm`, sample: 'bleed' };
  if (view === 'preview') {
    return [{ text: 'Onde a capa será cortada (não sai no arquivo)', sample: 'cut' }];
  }
  if (view === 'empty') {
    return [{ text: `Vista traseira · ${model.name}`, sample: null }, bleed];
  }
  const entries = [
    { text: 'Contorno da capa', sample: 'contour' },
    bleed,
    { text: 'Fora da impressão', sample: 'outside' },
  ];
  if (ui.showSafeMargin) {
    entries.push({ text: `Margem de segurança ${legendMm(safeMarginOf(model))} mm`, sample: 'margin' });
  }
  return entries;
}

// Texts of the legend under the stage for a view ('empty', 'edit', 'preview').
export function legendItems(view, model, ui) {
  return legendEntries(view, model, ui).map((entry) => entry.text);
}

// Box of the empty-state overlay over the case, in px of the stage box: the
// case rectangle, with the text kept below the lowest cutout that touches the
// top third of the case (paddingTop null when no cutout does).
export function emptyBox(layout, model) {
  const { scale, originX, originY } = layout;
  const width = model.case.width * scale;
  const height = model.case.height * scale;
  let bottom = null;
  for (const cutout of model.cutouts ?? []) {
    const top = cutout.shape === 'circle' ? cutout.cy - cutout.r : cutout.y;
    const end = cutout.shape === 'circle' ? cutout.cy + cutout.r : cutout.y + cutout.height;
    if (top < model.case.height / 3 && (bottom === null || end > bottom)) bottom = end;
  }
  return {
    left: originX - width / 2,
    top: originY - height / 2,
    width,
    height,
    paddingTop: bottom === null ? null : bottom * scale + EMPTY_TEXT_GAP_PX,
  };
}

// Whether a #RGB or #RRGGBB colour has a relative luminance below 0.4.
export function isDarkColour(hex) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!match) return false;
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
  const channel = (offset) => {
    const value = parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance < DARK_LUMINANCE;
}

const TOKEN_NAMES = [
  '--color-bg',
  '--color-text',
  '--color-text-2',
  '--color-guide',
  '--color-warn',
  '--color-select',
  '--color-border',
  '--color-border-strong',
  '--color-inset',
  '--shadow-cover',
  '--font-text',
];

// Canvas shadow from a CSS box-shadow 'x y blur colour' (canvas blur is
// about half the CSS blur radius).
function parseShadow(text) {
  const match = /^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(.+)$/.exec(text.trim());
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]), blur: Number(match[3]) / 2, color: match[4] };
}

function readTokens() {
  const style = getComputedStyle(document.documentElement);
  const tokens = {};
  for (const name of TOKEN_NAMES) tokens[name] = style.getPropertyValue(name).trim();
  tokens.shadow = parseShadow(tokens['--shadow-cover']);
  return tokens;
}

const BLEED_DASH = [6, 4];

// Edit view of the cover, drawn with the origin at the centre of the case
// and lengths in mm × scale.
function drawEdit(g, { model, project, scale, tokens }) {
  const shadow = tokens.shadow;
  g.save();
  if (shadow) {
    g.shadowOffsetX = shadow.x;
    g.shadowOffsetY = shadow.y;
    g.shadowBlur = shadow.blur;
    g.shadowColor = shadow.color;
  }
  g.fillStyle = project.background;
  g.beginPath();
  traceCase(g, model, 0, scale);
  g.fill();
  g.restore();

  g.save();
  g.beginPath();
  traceCase(g, model, 0, scale);
  g.clip();
  g.fillStyle = project.background;
  g.fill();
  g.restore();

  g.save();
  g.beginPath();
  traceCutouts(g, model, scale);
  g.fillStyle = tokens['--color-bg'];
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = tokens['--color-text'];
  g.stroke();
  g.restore();

  g.save();
  g.beginPath();
  traceCase(g, model, model.bleed, scale);
  g.lineWidth = 1.5;
  g.setLineDash(BLEED_DASH);
  g.strokeStyle = tokens['--color-guide'];
  g.stroke();
  g.restore();
}

function renderLegend(list, entries) {
  list.replaceChildren(
    ...entries.map(({ text, sample }) => {
      const item = document.createElement('li');
      item.className = 'stage-legend__item';
      if (sample) {
        const mark = document.createElement('span');
        mark.className = `stage-legend__sample stage-legend__sample--${sample}`;
        mark.setAttribute('aria-hidden', 'true');
        item.append(mark);
      }
      item.append(text);
      return item;
    }),
  );
}

// Mounts the stage on the page and publishes `ctx.stage`: the canvas follows
// the size of its box and is redrawn once per animation frame after a state
// change or a resize.
export function mountStage(ctx) {
  const byId = (id) => document.getElementById(id);
  const canvas = byId('stage-canvas');
  const box = canvas.parentElement;
  const empty = byId('stage-empty');
  const legend = byId('stage-legend');
  const g = canvas.getContext('2d');
  const tokens = readTokens();
  let layout = { scale: 1, originX: 0, originY: 0 };
  let legendKey = null;
  let frame = 0;

  function updateChrome(state, view, model) {
    const entries = legendEntries(view, model, state.ui);
    const key = entries.map((entry) => `${entry.sample}:${entry.text}`).join('|');
    if (key !== legendKey) {
      legendKey = key;
      renderLegend(legend, entries);
    }
    canvas.setAttribute('aria-label', stageLabel(model, state.project.layers.length));
    empty.hidden = view !== 'empty';
  }

  function placeEmpty(state, model) {
    if (empty.hidden) return;
    const placed = emptyBox(layout, model);
    empty.classList.add('stage-empty--placed');
    empty.classList.toggle('stage-empty--on-dark', isDarkColour(state.project.background));
    empty.style.left = `${placed.left}px`;
    empty.style.top = `${placed.top}px`;
    empty.style.width = `${placed.width}px`;
    empty.style.height = `${placed.height}px`;
    empty.style.paddingTop = placed.paddingTop === null ? '' : `${placed.paddingTop}px`;
  }

  function draw() {
    const state = ctx.state.getState();
    const model = ctx.model();
    const view = stageView(state);
    updateChrome(state, view, model);

    const width = box.clientWidth;
    const height = box.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    layout = stageLayout(width, height, model, model.bleed + STAGE_ROOM_MM);
    placeEmpty(state, model);

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(ratio, 0, 0, ratio, layout.originX * ratio, layout.originY * ratio);
    drawEdit(g, { model, project: state.project, scale: layout.scale, tokens });
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  // Point of the page in mm from the centre of the cover.
  function toMm(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - layout.originX) / layout.scale,
      y: (clientY - rect.top - layout.originY) / layout.scale,
    };
  }

  new ResizeObserver(schedule).observe(box);
  ctx.state.subscribe(schedule);
  ctx.stage = { toMm, pxPerMm: () => layout.scale };
  schedule();
}
