// Draft of the current work kept in this browser's IndexedDB: the record
// format, its storage and the autosave. Nothing here leaves the browser.

import { validateCustom } from './catalog.js';

export const DRAFT_VERSION = 1;

const FORMATS = ['png', 'jpeg'];
const DPIS = [150, 300, 600];
const CLIPS = ['rect', 'contour'];
const BLEED_MAX = 10;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
// Rounding slack for a crop whose offset plus side lands a hair over 1.
const CROP_SLACK = 1e-9;

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isString = (value) => typeof value === 'string';
const isBoolean = (value) => typeof value === 'boolean';
const isFraction = (value) => isNumber(value) && value >= 0 && value <= 1;

function copyCustomModel({ width, height, cornerRadius, bleed }) {
  return { width, height, cornerRadius, bleed };
}

function copyCrop({ x, y, width, height }) {
  return { x, y, width, height };
}

function copyLayer({ id, name, imageId, naturalWidth, naturalHeight, cx, cy, width, rotation, crop }) {
  return { id, name, imageId, naturalWidth, naturalHeight, cx, cy, width, rotation, crop: copyCrop(crop) };
}

function copyProject({ modelId, customModel, layers, background }) {
  return {
    modelId,
    customModel: copyCustomModel(customModel),
    layers: layers.map(copyLayer),
    background,
  };
}

function copyExportOptions({ format, dpi, bleedOn, bleedMm, clip, cameraHole, mirror }) {
  return { format, dpi, bleedOn, bleedMm, clip, cameraHole, mirror };
}

// The record saved for a state: a deep copy of the project, the export
// options and the order id, without the interface state or any bitmap.
export function serializeDraft(state) {
  return {
    version: DRAFT_VERSION,
    project: copyProject(state.project),
    exportOptions: copyExportOptions(state.exportOptions),
    orderId: state.orderId,
  };
}

function validCustomModel(custom) {
  if (!isObject(custom)) return false;
  const values = copyCustomModel(custom);
  if (!Object.values(values).every(isNumber)) return false;
  return Object.keys(validateCustom(values)).length === 0;
}

function validCrop(crop) {
  if (!isObject(crop)) return false;
  const { x, y, width, height } = crop;
  if (![x, y, width, height].every(isFraction)) return false;
  if (width <= 0 || height <= 0) return false;
  return x + width <= 1 + CROP_SLACK && y + height <= 1 + CROP_SLACK;
}

function validLayer(layer, imageIds) {
  if (!isObject(layer)) return false;
  const { id, name, imageId, naturalWidth, naturalHeight, cx, cy, width, rotation, crop } = layer;
  if (!isString(id) || id === '' || !isString(name) || !isString(imageId)) return false;
  if (![naturalWidth, naturalHeight, cx, cy, width, rotation].every(isNumber)) return false;
  if (naturalWidth <= 0 || naturalHeight <= 0 || width <= 0) return false;
  if (!validCrop(crop)) return false;
  return imageIds.has(imageId);
}

function validProject(project, imageIds) {
  if (!isObject(project)) return false;
  const { modelId, customModel, layers, background } = project;
  if (!isString(modelId) || modelId === '') return false;
  if (!validCustomModel(customModel)) return false;
  if (!isString(background) || !COLOR_PATTERN.test(background)) return false;
  return Array.isArray(layers) && layers.every((layer) => validLayer(layer, imageIds));
}

function validExportOptions(options) {
  if (!isObject(options)) return false;
  const { format, dpi, bleedOn, bleedMm, clip, cameraHole, mirror } = options;
  if (!FORMATS.includes(format) || !DPIS.includes(dpi) || !CLIPS.includes(clip)) return false;
  if (![bleedOn, cameraHole, mirror].every(isBoolean)) return false;
  return bleedMm === null || (isNumber(bleedMm) && bleedMm >= 0 && bleedMm <= BLEED_MAX);
}

// The project, export options and order id of a saved record, as fresh
// objects with only the known fields, or null when the record is not a valid
// version 1 draft or a layer uses an image that is not available.
export function parseDraft(record, availableImageIds) {
  if (!isObject(record) || record.version !== DRAFT_VERSION) return null;
  const imageIds = new Set(availableImageIds);
  if (!validProject(record.project, imageIds)) return null;
  if (!validExportOptions(record.exportOptions)) return null;
  if (!isString(record.orderId)) return null;
  return {
    project: copyProject(record.project),
    exportOptions: copyExportOptions(record.exportOptions),
    orderId: record.orderId,
  };
}
