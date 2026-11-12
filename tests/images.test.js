import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCEPTED_TYPES, isAccepted, createRegistry } from '../js/images.js';

// Fake decoder: every call waits until the test resolves or rejects it.
function fakeDecoder() {
  const calls = [];
  let closed = 0;
  function decode(blob) {
    return new Promise((resolve, reject) => {
      calls.push({
        blob,
        resolve(width, height) {
          const bitmap = {
            width,
            height,
            closed: false,
            close() {
              bitmap.closed = true;
              closed += 1;
            },
          };
          resolve(bitmap);
          return bitmap;
        },
        reject,
      });
    });
  }
  return { decode, calls, closedCount: () => closed };
}

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

const blob = (name) => ({ name, type: 'image/png' });

test('ACCEPTED_TYPES lists png, jpeg and webp', () => {
  assert.deepEqual(ACCEPTED_TYPES, ['image/png', 'image/jpeg', 'image/webp']);
});

test('isAccepted goes by the MIME type', () => {
  assert.equal(isAccepted({ type: 'image/png' }), true);
  assert.equal(isAccepted({ type: 'image/jpeg' }), true);
  assert.equal(isAccepted({ type: 'image/webp' }), true);
  assert.equal(isAccepted({ type: 'image/gif' }), false);
  assert.equal(isAccepted({ type: 'application/pdf' }), false);
  assert.equal(isAccepted({ type: '' }), false);
  assert.equal(isAccepted(null), false);
});

test('add stores the image and returns its id and size', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const first = registry.add(blob('a.png'), 'a.png');
  const second = registry.add(blob('b.png'), 'b.png');
  const bitmapA = fake.calls[0].resolve(400, 733);
  fake.calls[1].resolve(1000, 500);
  assert.deepEqual(await first, { imageId: 'id-1', naturalWidth: 400, naturalHeight: 733 });
  assert.deepEqual(await second, { imageId: 'id-2', naturalWidth: 1000, naturalHeight: 500 });
  assert.deepEqual(registry.ids(), ['id-1', 'id-2']);
  assert.equal(registry.getBitmap('id-1'), bitmapA);
  assert.equal(registry.getBlob('id-1'), fake.calls[0].blob);
  assert.equal(registry.getName('id-2'), 'b.png');
  assert.equal(registry.getBitmap('nope'), null);
  assert.equal(registry.getBlob('nope'), null);
  assert.equal(registry.getName('nope'), null);
});

test('restore stores the image under the given id', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const restored = registry.restore('saved-7', blob('x.jpg'));
  fake.calls[0].resolve(300, 200);
  assert.deepEqual(await restored, { imageId: 'saved-7', naturalWidth: 300, naturalHeight: 200 });
  assert.deepEqual(registry.ids(), ['saved-7']);
  assert.equal(registry.getName('saved-7'), 'x.jpg');
});

test('release closes exactly the images not kept', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const added = [registry.add(blob('a')), registry.add(blob('b')), registry.add(blob('c'))];
  const bitmaps = fake.calls.map((call) => call.resolve(10, 10));
  await Promise.all(added);
  registry.release(new Set(['id-2']));
  assert.equal(fake.closedCount(), 2);
  assert.deepEqual(
    bitmaps.map((b) => b.closed),
    [true, false, true],
  );
  assert.deepEqual(registry.ids(), ['id-2']);
});

test('a decode that ends after a release that did not keep it is discarded', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const pending = registry.restore('late', blob('late'));
  registry.release(new Set(['other']));
  const bitmap = fake.calls[0].resolve(10, 10);
  await assert.rejects(pending, { message: 'descartada' });
  assert.equal(bitmap.closed, true);
  assert.deepEqual(registry.ids(), []);
});

test('a decode kept by release still lands', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const pending = registry.restore('kept', blob('kept'));
  registry.release(['kept']);
  fake.calls[0].resolve(10, 20);
  assert.deepEqual(await pending, { imageId: 'kept', naturalWidth: 10, naturalHeight: 20 });
  assert.deepEqual(registry.ids(), ['kept']);
});

test('drop closes and forgets only the named images', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const added = [registry.add(blob('a')), registry.add(blob('b')), registry.add(blob('c'))];
  const bitmaps = fake.calls.map((call) => call.resolve(10, 10));
  await Promise.all(added);
  registry.drop(['id-1', 'id-3', 'unknown']);
  assert.deepEqual(
    bitmaps.map((b) => b.closed),
    [true, false, true],
  );
  assert.deepEqual(registry.ids(), ['id-2']);
});

test('a pending decode of another id survives a drop and lands', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const done = registry.add(blob('a'));
  fake.calls[0].resolve(10, 10);
  await done;
  const pending = registry.add(blob('b'));
  registry.drop(['id-1']);
  fake.calls[1].resolve(30, 40);
  assert.deepEqual(await pending, { imageId: 'id-2', naturalWidth: 30, naturalHeight: 40 });
  assert.deepEqual(registry.ids(), ['id-2']);
});

test('a pending decode of a dropped id rejects as discarded', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const pending = registry.restore('gone', blob('gone'));
  registry.drop(new Set(['gone']));
  const late = fake.calls[0].resolve(10, 10);
  await assert.rejects(pending, { message: 'descartada' });
  assert.equal(late.closed, true);
  assert.deepEqual(registry.ids(), []);
});

test('clear during a pending decode rejects it and closes the late bitmap', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const done = registry.add(blob('a'));
  fake.calls[0].resolve(10, 10);
  await done;
  const pending = registry.add(blob('b'));
  registry.clear();
  assert.equal(fake.closedCount(), 1);
  const late = fake.calls[1].resolve(10, 10);
  await assert.rejects(pending, { message: 'descartada' });
  assert.equal(late.closed, true);
  assert.equal(fake.closedCount(), 2);
  assert.deepEqual(registry.ids(), []);
});

test('a failed decode rejects and stores nothing', async () => {
  const fake = fakeDecoder();
  const registry = createRegistry({ decode: fake.decode, newId: sequentialIds() });
  const pending = registry.add(blob('broken'));
  fake.calls[0].reject(new Error('corrompida'));
  await assert.rejects(pending, { message: 'corrompida' });
  assert.deepEqual(registry.ids(), []);
});

test('a decode that throws synchronously rejects and stores nothing', async () => {
  const registry = createRegistry({
    decode() {
      throw new Error('sem suporte');
    },
    newId: sequentialIds(),
  });
  await assert.rejects(registry.add(blob('x')), { message: 'sem suporte' });
  assert.deepEqual(registry.ids(), []);
});
