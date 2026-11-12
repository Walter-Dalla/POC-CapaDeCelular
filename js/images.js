// Registry of the images the user loaded: the decoded bitmap, the original
// file and its name, by image id. Layers only keep the image id.

import { newId as defaultNewId } from './layers.js';

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Whether the file is of an accepted image type (by its MIME type).
export function isAccepted(file) {
  return Boolean(file) && ACCEPTED_TYPES.includes(file.type);
}

// Decodes a blob in the browser, applying the EXIF orientation.
export function defaultDecode(blob) {
  return createImageBitmap(blob, { imageOrientation: 'from-image' });
}

function closeBitmap(bitmap) {
  if (bitmap && typeof bitmap.close === 'function') bitmap.close();
}

// decode(blob) resolves to an object with width, height and close(). A decode
// that finishes after clear(), or after a release() that did not keep its id,
// is closed and its promise rejects with Error('descartada'); a failed decode
// rejects and stores nothing.
export function createRegistry({ decode = defaultDecode, newId = defaultNewId } = {}) {
  const entries = new Map();
  const pending = new Map();
  let generation = 0;

  function load(imageId, blob, name) {
    const token = { cancelled: false, generation };
    const previous = pending.get(imageId);
    if (previous) previous.cancelled = true;
    pending.set(imageId, token);
    const settle = () => {
      if (pending.get(imageId) === token) pending.delete(imageId);
    };
    return new Promise((resolve) => resolve(decode(blob))).then(
      (bitmap) => {
        settle();
        if (token.cancelled || token.generation !== generation) {
          closeBitmap(bitmap);
          throw new Error('descartada');
        }
        const old = entries.get(imageId);
        if (old && old.bitmap !== bitmap) closeBitmap(old.bitmap);
        entries.set(imageId, { bitmap, blob, name });
        return { imageId, naturalWidth: bitmap.width, naturalHeight: bitmap.height };
      },
      (error) => {
        settle();
        throw error;
      },
    );
  }

  return {
    // Decodes and stores a new image under a fresh id.
    add(blob, name) {
      return load(newId(), blob, name ?? blob?.name ?? '');
    },
    // Decodes and stores an image under a given id (a saved project).
    restore(imageId, blob, name) {
      return load(imageId, blob, name ?? blob?.name ?? '');
    },
    getBitmap(id) {
      return entries.get(id)?.bitmap ?? null;
    },
    getBlob(id) {
      return entries.get(id)?.blob ?? null;
    },
    getName(id) {
      return entries.get(id)?.name ?? null;
    },
    ids() {
      return [...entries.keys()];
    },
    // Closes and forgets every image whose id is not in keepIds; pending
    // decodes of other ids are discarded when they finish.
    release(keepIds) {
      const keep = new Set(keepIds);
      for (const [id, entry] of entries) {
        if (!keep.has(id)) {
          closeBitmap(entry.bitmap);
          entries.delete(id);
        }
      }
      for (const [id, token] of pending) {
        if (!keep.has(id)) token.cancelled = true;
      }
    },
    // Closes and forgets exactly the given ids and discards their pending
    // decodes; every other image and decode is left alone, unknown ids ignored.
    drop(ids) {
      for (const id of ids) {
        const entry = entries.get(id);
        if (entry) {
          closeBitmap(entry.bitmap);
          entries.delete(id);
        }
        const token = pending.get(id);
        if (token) token.cancelled = true;
      }
    },
    // Closes and forgets every image, discarding pending decodes.
    clear() {
      for (const entry of entries.values()) closeBitmap(entry.bitmap);
      entries.clear();
      generation += 1;
    },
  };
}
