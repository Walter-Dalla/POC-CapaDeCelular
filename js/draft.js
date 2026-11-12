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

// Image writes that bring the stored images in line with a record: the
// record's images not stored yet (once each, in layer order) and the stored
// images no layer of the record uses.
export function planWrites(storedImageIds, record) {
  const stored = new Set(storedImageIds);
  const used = new Set(record.project.layers.map((layer) => layer.imageId));
  return {
    put: [...used].filter((id) => !stored.has(id)),
    remove: [...stored].filter((id) => !used.has(id)),
  };
}

// Whether a state change touches what the draft saves.
export function changesDraft(next, prev) {
  return next.project !== prev.project || next.exportOptions !== prev.exportOptions || next.orderId !== prev.orderId;
}

const DB_NAME = 'capa-studio';
const DB_VERSION = 1;
const DRAFT_STORE = 'draft';
const IMAGE_STORE = 'images';
const DRAFT_KEY = 'current';

function done(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function finished(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('transação abortada'));
  });
}

// Opens (and on first use creates) the draft database; rejects when the
// browser has no IndexedDB or refuses it.
export function openDraftDb(factory = globalThis.indexedDB) {
  if (!factory) return Promise.reject(new Error('IndexedDB indisponível'));
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = factory.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
}

// Saves the record and its images in one transaction over both stores, so the
// database always holds exactly what the last save wrote. getBlob(imageId)
// gives the original file of an image; a missing one aborts the save.
export async function saveDraft(db, record, getBlob) {
  const transaction = db.transaction([DRAFT_STORE, IMAGE_STORE], 'readwrite');
  const result = finished(transaction);
  const images = transaction.objectStore(IMAGE_STORE);
  try {
    const stored = await done(images.getAllKeys());
    const { put, remove } = planWrites(stored, record);
    for (const id of remove) images.delete(id);
    for (const id of put) {
      const blob = getBlob(id);
      if (!blob) throw new Error(`imagem ${id} ausente`);
      images.put(blob, id);
    }
    transaction.objectStore(DRAFT_STORE).put(record, DRAFT_KEY);
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction already ended on its own.
    }
    result.catch(() => {});
    throw error;
  }
  return result;
}

// The saved record and the stored image files by id, or null without a record.
export async function readDraft(db) {
  const transaction = db.transaction([DRAFT_STORE, IMAGE_STORE], 'readonly');
  const result = finished(transaction);
  const images = transaction.objectStore(IMAGE_STORE);
  const [record, keys, blobs] = await Promise.all([
    done(transaction.objectStore(DRAFT_STORE).get(DRAFT_KEY)),
    done(images.getAllKeys()),
    done(images.getAll()),
  ]);
  await result;
  if (record === undefined) return null;
  return { record, blobs: new Map(keys.map((key, index) => [key, blobs[index]])) };
}

// Deletes the record and every stored image.
export function clearDraft(db) {
  const transaction = db.transaction([DRAFT_STORE, IMAGE_STORE], 'readwrite');
  const result = finished(transaction);
  transaction.objectStore(DRAFT_STORE).clear();
  transaction.objectStore(IMAGE_STORE).clear();
  return result;
}

// Debounced saving: touch() (re)starts the timer, the save runs `delay` ms
// after the last touch, saves never overlap (a touch during a save schedules
// one more after it) and flush() saves at once when something is pending.
// A rejected save is left to `save` to report.
export function createAutosave({
  save,
  delay = 500,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
}) {
  let timer = null;
  let dirty = false;
  let running = null;
  let urgent = false;

  function stopTimer() {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function schedule() {
    stopTimer();
    timer = setTimer(() => {
      timer = null;
      run();
    }, delay);
  }

  function run() {
    stopTimer();
    dirty = false;
    urgent = false;
    running = Promise.resolve()
      .then(save)
      .catch(() => {})
      .then(() => {
        running = null;
        if (!dirty) return;
        if (urgent) run();
        else schedule();
      });
    return running;
  }

  return {
    touch() {
      dirty = true;
      if (!running) schedule();
    },
    flush() {
      if (!dirty) return running ?? Promise.resolve();
      if (running) {
        urgent = true;
        return running;
      }
      return run();
    },
    pending() {
      return dirty || running !== null;
    },
  };
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
