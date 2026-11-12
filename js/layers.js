// Layers of the cover project. Every function takes a project and returns a
// new one, leaving the input untouched; an unknown layer id returns the same
// project object. Lengths are millimetres, layer centres start at the centre
// of the cover, rotation is in degrees, clockwise.

const FULL_CROP = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const DUPLICATE_OFFSET_MM = 5;
const MIN_WIDTH_MM = 5;
const MAX_WIDTH_MM = 2000;
const MIN_CROP_SIDE = 0.05;
const MM_PER_INCH = 25.4;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

// A new unique id. crypto.randomUUID is missing on plain-http addresses, so
// a time and random based string stands in for it there.
export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cropOf(layer) {
  return layer.crop ?? FULL_CROP;
}

// Height of the visible part divided by its width.
function aspectOf(layer) {
  const crop = cropOf(layer);
  return (crop.height * layer.naturalHeight) / (crop.width * layer.naturalWidth);
}

// Width that makes the layer cover the whole case plus bleed rectangle,
// within the 5–2000 mm width limits.
function coverWidth(layer, model, bleedMm) {
  const width = model.case.width + 2 * bleedMm;
  const height = model.case.height + 2 * bleedMm;
  return clampWidth(Math.max(width, height / aspectOf(layer)));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampCentre(cx, cy, bounds) {
  if (!bounds) return { cx, cy };
  return {
    cx: clamp(cx, -bounds.halfWidth, bounds.halfWidth),
    cy: clamp(cy, -bounds.halfHeight, bounds.halfHeight),
  };
}

function indexOf(project, id) {
  return project.layers.findIndex((layer) => layer.id === id);
}

// Replaces the layer with the given id by change(layer); same project when the
// id is unknown.
function updateLayer(project, id, change) {
  const index = indexOf(project, id);
  if (index < 0) return project;
  const layers = project.layers.slice();
  layers[index] = change(project.layers[index]);
  return { ...project, layers };
}

// A layer showing the whole image, centred and covering the case plus bleed.
export function createLayer({ id, name, imageId, naturalWidth, naturalHeight }, model, bleedMm) {
  const layer = {
    id,
    name,
    imageId,
    naturalWidth,
    naturalHeight,
    cx: 0,
    cy: 0,
    width: 0,
    rotation: 0,
    crop: { ...FULL_CROP },
  };
  return { ...layer, width: coverWidth(layer, model, bleedMm) };
}

// The layer with the given id, or null.
export function getLayer(project, id) {
  return project.layers.find((layer) => layer.id === id) ?? null;
}

// Adds the layer on top of the others.
export function addLayer(project, layer) {
  return { ...project, layers: [...project.layers, layer] };
}

export function removeLayer(project, id) {
  const index = indexOf(project, id);
  if (index < 0) return project;
  return { ...project, layers: project.layers.filter((_, i) => i !== index) };
}

// A copy of the layer (same image, crop and name) right above it, moved 5 mm
// right and down; its centre is clamped into bounds when they are given.
export function duplicateLayer(project, id, newLayerId, bounds) {
  const index = indexOf(project, id);
  if (index < 0) return project;
  const original = project.layers[index];
  const centre = clampCentre(
    original.cx + DUPLICATE_OFFSET_MM,
    original.cy + DUPLICATE_OFFSET_MM,
    bounds,
  );
  const copy = { ...original, id: newLayerId, crop: { ...cropOf(original) }, ...centre };
  const layers = project.layers.slice();
  layers.splice(index + 1, 0, copy);
  return { ...project, layers };
}

function swap(project, index, other) {
  const layers = project.layers.slice();
  [layers[index], layers[other]] = [layers[other], layers[index]];
  return { ...project, layers };
}

// Moves the layer one position up (towards the top); same project at the top.
export function raiseLayer(project, id) {
  const index = indexOf(project, id);
  if (index < 0 || index === project.layers.length - 1) return project;
  return swap(project, index, index + 1);
}

// Moves the layer one position down; same project at the bottom.
export function lowerLayer(project, id) {
  const index = indexOf(project, id);
  if (index <= 0) return project;
  return swap(project, index, index - 1);
}

// Sets the background colour; only #RRGGBB is accepted, stored upper-cased.
export function setBackground(project, color) {
  if (typeof color !== 'string' || !COLOR_PATTERN.test(color)) return project;
  return { ...project, background: color.toUpperCase() };
}

// Half sizes of the case plus bleed rectangle, the area a layer centre may
// occupy.
export function layerBounds(model, bleedMm) {
  return {
    halfWidth: model.case.width / 2 + bleedMm,
    halfHeight: model.case.height / 2 + bleedMm,
  };
}

// Moves the layer centre to (cx, cy), clamped into bounds.
export function moveLayer(project, id, cx, cy, bounds) {
  return updateLayer(project, id, (layer) => ({ ...layer, ...clampCentre(cx, cy, bounds) }));
}

// Moves the layer centre by (dx, dy), clamped into bounds.
export function moveLayerBy(project, id, dx, dy, bounds) {
  return updateLayer(project, id, (layer) => ({
    ...layer,
    ...clampCentre(layer.cx + dx, layer.cy + dy, bounds),
  }));
}

function clampWidth(width) {
  return clamp(width, MIN_WIDTH_MM, MAX_WIDTH_MM);
}

// Sets the width of the visible part, clamped to 5–2000 mm; the centre stays.
export function setLayerWidth(project, id, width) {
  return updateLayer(project, id, (layer) => ({ ...layer, width: clampWidth(width) }));
}

// Multiplies the width by factor, clamped to 5–2000 mm; the centre stays.
export function scaleLayer(project, id, factor) {
  return updateLayer(project, id, (layer) => ({ ...layer, width: clampWidth(layer.width * factor) }));
}

// Angle in degrees brought into (−180, 180].
export function normalizeRotation(degrees) {
  const turn = ((degrees % 360) + 360) % 360;
  return (turn > 180 ? turn - 360 : turn) + 0;
}

export function setRotation(project, id, degrees) {
  return updateLayer(project, id, (layer) => ({ ...layer, rotation: normalizeRotation(degrees) }));
}

export function rotateLayerBy(project, id, degrees) {
  return updateLayer(project, id, (layer) => ({
    ...layer,
    rotation: normalizeRotation(layer.rotation + degrees),
  }));
}

// Angle rounded to the nearest multiple of step, in (−180, 180].
export function snapRotation(degrees, step = 15) {
  return normalizeRotation(Math.round(degrees / step) * step);
}

// "Preencher": the smallest size whose visible part covers the whole case
// plus bleed rectangle; centred, no rotation.
export function fillLayer(project, id, model, bleedMm) {
  return updateLayer(project, id, (layer) => ({
    ...layer,
    cx: 0,
    cy: 0,
    rotation: 0,
    width: coverWidth(layer, model, bleedMm),
  }));
}

// "Caber": the largest size wholly inside the case rectangle; centred, no
// rotation.
export function fitLayer(project, id, model) {
  return updateLayer(project, id, (layer) => ({
    ...layer,
    cx: 0,
    cy: 0,
    rotation: 0,
    width: clampWidth(Math.min(model.case.width, model.case.height / aspectOf(layer))),
  }));
}

// Centres the layer on the cover, keeping its size and rotation.
export function centreLayer(project, id) {
  return updateLayer(project, id, (layer) => ({ ...layer, cx: 0, cy: 0 }));
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

// Crop rectangle (fractions of the image) brought inside 0–1 with each side at
// least 0.05: each side is first limited to 0.05–1, then the rectangle is
// shifted back inside the image.
export function clampCrop(crop) {
  const width = clamp(finiteOr(crop?.width, 1), MIN_CROP_SIDE, 1);
  const height = clamp(finiteOr(crop?.height, 1), MIN_CROP_SIDE, 1);
  return {
    x: clamp(finiteOr(crop?.x, 0), 0, 1 - width),
    y: clamp(finiteOr(crop?.y, 0), 0, 1 - height),
    width,
    height,
  };
}

// Changes the crop keeping every visible pixel of the image where it was on
// the cover: the scale (mm per image pixel) stays, the width follows the new
// crop width and the centre moves by the shift between the old and the new
// crop centres, turned by the layer rotation. The centre is not clamped.
export function setCrop(project, id, crop) {
  return updateLayer(project, id, (layer) => {
    const before = cropOf(layer);
    const after = clampCrop(crop);
    const mmPerPx = layer.width / (before.width * layer.naturalWidth);
    const dx = (after.x + after.width / 2 - (before.x + before.width / 2)) * layer.naturalWidth * mmPerPx;
    const dy = (after.y + after.height / 2 - (before.y + before.height / 2)) * layer.naturalHeight * mmPerPx;
    const a = (layer.rotation * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return {
      ...layer,
      crop: after,
      width: mmPerPx * after.width * layer.naturalWidth,
      cx: layer.cx + dx * cos - dy * sin,
      cy: layer.cy + dx * sin + dy * cos,
    };
  });
}

// Back to the whole image, keeping the image where it was.
export function resetCrop(project, id) {
  return setCrop(project, id, FULL_CROP);
}

// Print resolution below which a layer is reported as low.
export const LOW_DPI = 150;

// Image pixels per inch of the layer once printed: the visible pixels across
// divided by the printed width in inches. Not rounded.
export function effectiveDpi(layer) {
  return (cropOf(layer).width * layer.naturalWidth) / (layer.width / MM_PER_INCH);
}

export function isLowRes(layer) {
  return effectiveDpi(layer) < LOW_DPI;
}

// Layers printed below LOW_DPI, the top layer first.
export function lowResLayers(project) {
  return project.layers.filter(isLowRes).reverse();
}
