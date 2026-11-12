// The stage: the canvas that shows the cover in the edit view and in the
// file preview. It reads the state and draws; it handles no pointer input.
// Lengths of the state are in millimetres from the centre of the cover; they
// become screen pixels only here, through the scale of the stage layout.

import {
  effectiveBleed,
  layerRect,
  rectCorners,
  selectionHandles,
  traceCase,
  traceCutouts,
  traceRoundRect,
} from './geometry.js';
import { formatMm, plural } from './format.js';
import { drawComposition, drawLayers } from './render.js';

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

// Caption above the file preview: what the exported rectangle contains.
export function previewCaption(exportOptions, model) {
  if (exportOptions.clip === 'contour') return 'Prévia do arquivo · no contorno da capa';
  return effectiveBleed(exportOptions, model) > 0
    ? 'Prévia do arquivo · retângulo inteiro com sangria'
    : 'Prévia do arquivo · retângulo inteiro sem sangria';
}

// Texts of the width and height rulers of the file preview.
export function previewRulers(exportOptions, model) {
  const bleed = effectiveBleed(exportOptions, model);
  return {
    width: `${formatMm(model.case.width + 2 * bleed)} mm`,
    height: `${formatMm(model.case.height + 2 * bleed)} mm`,
  };
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

const FULL_CROP = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });

// Point (lx, ly) of a rotated frame turned into an offset on the cover.
function rotateOffset(lx, ly, rotation) {
  const a = (rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
}

// Rectangle in mm on the cover of the whole original image of a layer: the
// layer's scale and rotation, placed so that its cropped part stays where
// the layer shows it.
export function cropFrame(layer) {
  const crop = layer.crop ?? FULL_CROP;
  const width = layer.width / crop.width;
  const height = (width * layer.naturalHeight) / layer.naturalWidth;
  const offset = rotateOffset(
    (crop.x + crop.width / 2 - 0.5) * width,
    (crop.y + crop.height / 2 - 0.5) * height,
    layer.rotation,
  );
  return { cx: layer.cx - offset.x, cy: layer.cy - offset.y, width, height, rotation: layer.rotation };
}

// Rectangle in mm on the cover of a crop draft (fractions of the original image).
export function cropRectOnCover(layer, draft) {
  const frame = cropFrame(layer);
  const offset = rotateOffset(
    (draft.x + draft.width / 2 - 0.5) * frame.width,
    (draft.y + draft.height / 2 - 0.5) * frame.height,
    frame.rotation,
  );
  return {
    cx: frame.cx + offset.x,
    cy: frame.cy + offset.y,
    width: draft.width * frame.width,
    height: draft.height * frame.height,
    rotation: frame.rotation,
  };
}

// The layer being cropped, or null when crop mode names no existing layer.
function cropLayerOf(state) {
  const id = state.ui.cropLayerId;
  if (id === null || id === undefined) return null;
  return state.project.layers.find((layer) => layer.id === id) ?? null;
}

// Ordered steps of the edit view for a state: the drawing code follows it.
export function editDrawPlan(state, model) {
  const { project, ui } = state;
  const plan = ['shadow', 'background'];
  if (project.layers.length === 0) return [...plan, ...(model.cutouts?.length ? ['cutouts'] : []), 'bleed'];
  const cropping = cropLayerOf(state) !== null;
  plan.push('layers-faded', 'layers-clipped');
  // While cropping, the whole image sits under the cover marks and its frame on top of them.
  if (cropping) plan.push('crop-image');
  if (model.cutouts?.length) plan.push('cutouts');
  plan.push('contour', 'bleed');
  if (ui.showSafeMargin) plan.push('safe-margin');
  if (ui.guides?.v) plan.push('guide-v');
  if (ui.guides?.h) plan.push('guide-h');
  const selected = project.layers.some((layer) => layer.id === ui.selectedLayerId);
  if (cropping) plan.push('crop-frame');
  else if (selected && ui.cropLayerId === null) plan.push('selection');
  return plan;
}

const BLEED_DASH = [6, 4];
const WARN_DASH = [6, 4];
const OUTSIDE_ALPHA = 0.28;
// Anything drawn outside the case is within this many px of the origin.
const FAR_PX = 100000;
const CORNER_HANDLE_PX = 14;
const CORNER_HANDLE_BORDER_PX = 2;
const CORNER_HANDLE_RADIUS_PX = 3;
const ROTATE_HANDLE_RADIUS_PX = 9;
const ROTATE_HANDLE_BORDER_PX = 3;

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

function withShadow(g, shadow) {
  if (!shadow) return;
  g.shadowOffsetX = shadow.x;
  g.shadowOffsetY = shadow.y;
  g.shadowBlur = shadow.blur;
  g.shadowColor = shadow.color;
}

// Line drawn twice so it reads over any cover: a dark under-stroke, then the
// yellow dashes.
function strokeWarn(g, tokens, trace) {
  g.save();
  g.beginPath();
  trace();
  g.lineWidth = 3;
  g.strokeStyle = tokens['--color-bg'];
  g.stroke();
  g.lineWidth = 1.5;
  g.setLineDash(WARN_DASH);
  g.strokeStyle = tokens['--color-warn'];
  g.stroke();
  g.restore();
}

// Rotated rectangle of a rect in mm, as a closed path in px.
function traceRect(g, rect, scale) {
  const corners = rectCorners(rect);
  corners.forEach((point, index) => {
    if (index === 0) g.moveTo(point.x * scale, point.y * scale);
    else g.lineTo(point.x * scale, point.y * scale);
  });
  g.closePath();
}

// A rect outlined in the selection colour with its four square corner handles.
function drawFrame(g, rect, scale, tokens) {
  const select = tokens['--color-select'];
  g.save();
  g.beginPath();
  traceRect(g, rect, scale);
  g.lineWidth = 2;
  g.strokeStyle = select;
  g.stroke();
  const half = CORNER_HANDLE_PX / 2;
  const inner = CORNER_HANDLE_PX - 2 * CORNER_HANDLE_BORDER_PX;
  for (const corner of rectCorners(rect)) {
    g.save();
    g.translate(corner.x * scale, corner.y * scale);
    g.rotate(radians(rect.rotation));
    g.beginPath();
    traceRoundRect(g, -half, -half, CORNER_HANDLE_PX, CORNER_HANDLE_PX, CORNER_HANDLE_RADIUS_PX);
    g.fillStyle = select;
    g.fill();
    g.beginPath();
    traceRoundRect(g, -inner / 2, -inner / 2, inner, inner, CORNER_HANDLE_RADIUS_PX - CORNER_HANDLE_BORDER_PX);
    g.fillStyle = tokens['--color-text'];
    g.fill();
    g.restore();
  }
  g.restore();
}

// Selection of a layer: its frame, the stem and the round rotate handle.
function drawSelection(g, layer, scale, tokens) {
  const rect = layerRect(layer);
  drawFrame(g, rect, scale, tokens);
  const handles = selectionHandles(rect, scale);
  const top = { x: (handles.nw.x + handles.ne.x) / 2, y: (handles.nw.y + handles.ne.y) / 2 };
  g.save();
  g.beginPath();
  g.moveTo(top.x * scale, top.y * scale);
  g.lineTo(handles.rotate.x * scale, handles.rotate.y * scale);
  g.lineWidth = 2;
  g.strokeStyle = tokens['--color-select'];
  g.stroke();
  g.beginPath();
  g.arc(handles.rotate.x * scale, handles.rotate.y * scale, ROTATE_HANDLE_RADIUS_PX, 0, 2 * Math.PI);
  g.fillStyle = tokens['--color-text'];
  g.fill();
  g.beginPath();
  g.arc(handles.rotate.x * scale, handles.rotate.y * scale, ROTATE_HANDLE_RADIUS_PX - ROTATE_HANDLE_BORDER_PX, 0, 2 * Math.PI);
  g.fillStyle = tokens['--color-select'];
  g.fill();
  g.restore();
}

// Edit view of the cover, drawn with the origin at the centre of the case
// and lengths in mm × scale, step by step as editDrawPlan lists them.
function drawEdit(g, { state, model, scale, tokens, getBitmap }) {
  const { project, ui } = state;
  const cropLayer = cropLayerOf(state);
  // The layer being cropped is drawn on its own by the crop steps.
  const layers = cropLayer ? project.layers.filter((layer) => layer !== cropLayer) : project.layers;
  const cropDraftRect = () => cropRectOnCover(cropLayer, ui.cropDraft ?? cropLayer.crop ?? FULL_CROP);
  const steps = {
    shadow() {
      g.save();
      withShadow(g, tokens.shadow);
      g.fillStyle = project.background;
      g.beginPath();
      traceCase(g, model, 0, scale);
      g.fill();
      g.restore();
    },
    background() {
      g.save();
      g.beginPath();
      traceCase(g, model, 0, scale);
      g.clip();
      g.fillStyle = project.background;
      g.fill();
      g.restore();
    },
    'layers-faded'() {
      g.save();
      g.beginPath();
      g.rect(-FAR_PX, -FAR_PX, 2 * FAR_PX, 2 * FAR_PX);
      traceCase(g, model, 0, scale);
      g.clip('evenodd');
      g.globalAlpha = OUTSIDE_ALPHA;
      drawLayers(g, layers, getBitmap, scale);
      g.restore();
    },
    'layers-clipped'() {
      g.save();
      g.beginPath();
      traceCase(g, model, 0, scale);
      g.clip();
      drawLayers(g, layers, getBitmap, scale);
      g.restore();
    },
    cutouts() {
      g.save();
      g.beginPath();
      traceCutouts(g, model, scale);
      g.fillStyle = tokens['--color-bg'];
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = tokens['--color-text'];
      g.stroke();
      g.restore();
    },
    contour() {
      g.save();
      g.beginPath();
      traceCase(g, model, 0, scale);
      g.lineWidth = 2;
      g.strokeStyle = tokens['--color-text'];
      g.stroke();
      g.restore();
    },
    bleed() {
      g.save();
      g.beginPath();
      traceCase(g, model, model.bleed, scale);
      g.lineWidth = 1.5;
      g.setLineDash(BLEED_DASH);
      g.strokeStyle = tokens['--color-guide'];
      g.stroke();
      g.restore();
    },
    'safe-margin'() {
      strokeWarn(g, tokens, () => traceCase(g, model, -safeMarginOf(model), scale));
    },
    'guide-v'() {
      const half = (model.case.height / 2) * scale;
      strokeWarn(g, tokens, () => {
        g.moveTo(0, -half);
        g.lineTo(0, half);
      });
    },
    'guide-h'() {
      const half = (model.case.width / 2) * scale;
      strokeWarn(g, tokens, () => {
        g.moveTo(-half, 0);
        g.lineTo(half, 0);
      });
    },
    selection() {
      const layer = layers.find((item) => item.id === ui.selectedLayerId);
      drawSelection(g, layer, scale, tokens);
    },
    // The whole image of the layer being cropped: faded outside the draft, full inside it.
    'crop-image'() {
      const frame = cropFrame(cropLayer);
      const whole = { ...cropLayer, cx: frame.cx, cy: frame.cy, width: frame.width, crop: FULL_CROP };
      g.save();
      g.globalAlpha = OUTSIDE_ALPHA;
      drawLayers(g, [whole], getBitmap, scale);
      g.restore();
      g.save();
      g.beginPath();
      traceRect(g, cropDraftRect(), scale);
      g.clip();
      drawLayers(g, [whole], getBitmap, scale);
      g.restore();
    },
    // The draft outline and its four corner handles, over everything else.
    'crop-frame'() {
      drawFrame(g, cropDraftRect(), scale, tokens);
    },
  };
  for (const step of editDrawPlan(state, model)) steps[step]();
}

const CHECKER_PX = 8;
const CUT_DASH = [6, 4];
const RULER_GAP_PX = 8;
const RULER_FONT_PX = 13;

// Checkerboard over the rectangle (x, y, w, h), in px, marking transparency.
function fillChecker(g, x, y, w, h, tokens) {
  g.fillStyle = tokens['--color-border'];
  g.fillRect(x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = tokens['--color-inset'];
  for (let row = 0; y + row * CHECKER_PX < y + h; row += 1) {
    for (let col = row % 2; x + col * CHECKER_PX < x + w; col += 2) {
      g.fillRect(x + col * CHECKER_PX, y + row * CHECKER_PX, CHECKER_PX, CHECKER_PX);
    }
  }
  g.restore();
}

// Ruler: a text centred on a segment from (0, 0) to (length, 0), the line
// broken around the text.
function drawRuler(g, length, text, tokens) {
  const textWidth = g.measureText(text).width;
  const gapStart = length / 2 - textWidth / 2 - RULER_GAP_PX;
  const gapEnd = length / 2 + textWidth / 2 + RULER_GAP_PX;
  g.beginPath();
  if (gapStart > 0) {
    g.moveTo(0, 0);
    g.lineTo(gapStart, 0);
  }
  if (gapEnd < length) {
    g.moveTo(gapEnd, 0);
    g.lineTo(length, 0);
  }
  g.lineWidth = 1;
  g.strokeStyle = tokens['--color-border-strong'];
  g.stroke();
  g.fillStyle = tokens['--color-text-2'];
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, length / 2, 0);
}

// File preview: the case + bleed rectangle as the export draws it, over a
// checkerboard where the file is transparent, with the cut line and rulers.
// Origin at the centre of the case, lengths in mm × scale; ratio is the
// device pixel ratio of the stage canvas.
function drawPreview(g, { state, model, scale, ratio, tokens, getBitmap }) {
  const { project, exportOptions } = state;
  const bleedMm = effectiveBleed(exportOptions, model);
  const width = (model.case.width + 2 * bleedMm) * scale;
  const height = (model.case.height + 2 * bleedMm) * scale;
  const left = -width / 2;
  const top = -height / 2;

  const file = document.createElement('canvas');
  file.width = Math.max(1, Math.round(width * ratio));
  file.height = Math.max(1, Math.round(height * ratio));
  drawComposition(file.getContext('2d'), {
    model,
    layers: project.layers,
    background: project.background,
    getBitmap,
    scale: file.width / (model.case.width + 2 * bleedMm),
    bleedMm,
    clip: exportOptions.clip,
    cameraHole: exportOptions.cameraHole,
    mirror: exportOptions.mirror,
  });

  g.save();
  withShadow(g, tokens.shadow);
  g.fillStyle = tokens['--color-border'];
  g.fillRect(left, top, width, height);
  g.restore();
  fillChecker(g, left, top, width, height, tokens);
  g.drawImage(file, left, top, width, height);

  g.save();
  g.beginPath();
  traceCase(g, model, 0, scale);
  g.lineWidth = 1.5;
  g.setLineDash(CUT_DASH);
  g.strokeStyle = tokens['--color-text'];
  g.stroke();
  g.restore();

  const rulers = previewRulers(exportOptions, model);
  const offset = RULER_GAP_PX + RULER_FONT_PX / 2;
  g.save();
  g.font = `${RULER_FONT_PX}px ${tokens['--font-text']}`;
  g.translate(left, height / 2 + offset);
  drawRuler(g, width, rulers.width, tokens);
  g.restore();
  g.save();
  g.font = `${RULER_FONT_PX}px ${tokens['--font-text']}`;
  g.translate(width / 2 + offset, top);
  g.rotate(Math.PI / 2);
  drawRuler(g, height, rulers.height, tokens);
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
  const toolbar = byId('stage-toolbar');
  const caption = byId('stage-caption');
  const cropBar = byId('crop-bar');
  const g = canvas.getContext('2d');
  const tokens = readTokens();
  let layout = { scale: 1, originX: 0, originY: 0 };
  let legendKey = null;
  let frame = 0;
  // Without an image registry the layers have no bitmap and are not drawn.
  const getBitmap = (id) => ctx.images?.getBitmap(id) ?? null;

  function updateChrome(state, view, model) {
    const entries = legendEntries(view, model, state.ui);
    const key = entries.map((entry) => `${entry.sample}:${entry.text}`).join('|');
    if (key !== legendKey) {
      legendKey = key;
      renderLegend(legend, entries);
    }
    canvas.setAttribute('aria-label', stageLabel(model, state.project.layers.length));
    empty.hidden = view !== 'empty';
    const preview = view === 'preview';
    const cropping = view === 'edit' && cropLayerOf(state) !== null;
    toolbar.hidden = preview || cropping;
    cropBar.hidden = !cropping;
    caption.hidden = !preview;
    if (preview) caption.textContent = previewCaption(state.exportOptions, model);
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
    const scene = { state, model, scale: layout.scale, ratio, tokens, getBitmap };
    if (view === 'preview') drawPreview(g, scene);
    else drawEdit(g, scene);
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
  // The rulers are drawn with the page font once it has loaded.
  document.fonts?.ready.then(schedule);
  ctx.stage = { toMm, pxPerMm: () => layout.scale };
  schedule();
}
