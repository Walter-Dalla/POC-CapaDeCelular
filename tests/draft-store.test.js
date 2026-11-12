import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planWrites, changesDraft, createAutosave } from '../js/draft.js';

function layer(id, imageId) {
  return {
    id,
    name: id,
    imageId,
    naturalWidth: 100,
    naturalHeight: 100,
    cx: 0,
    cy: 0,
    width: 30,
    rotation: 0,
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}

function record(...layers) {
  return {
    version: 1,
    project: { modelId: 'custom', customModel: { width: 70, height: 140, cornerRadius: 10, bleed: 2 }, layers, background: '#FFFFFF' },
    exportOptions: { format: 'png', dpi: 300, bleedOn: true, bleedMm: null, clip: 'rect', cameraHole: false, mirror: false },
    orderId: '',
  };
}

test('planWrites puts a new image', () => {
  assert.deepEqual(planWrites([], record(layer('l1', 'img1'))), { put: ['img1'], remove: [] });
});

test('planWrites puts an image shared by two layers once', () => {
  assert.deepEqual(planWrites([], record(layer('l1', 'img1'), layer('l2', 'img1'))), { put: ['img1'], remove: [] });
});

test('planWrites removes a stored image no layer uses', () => {
  assert.deepEqual(planWrites(['img1', 'img2'], record(layer('l2', 'img2'))), { put: [], remove: ['img1'] });
});

test('planWrites leaves unchanged images alone', () => {
  assert.deepEqual(planWrites(['img1', 'img2'], record(layer('l1', 'img1'), layer('l2', 'img2'))), { put: [], remove: [] });
});

test('planWrites with no layers removes everything stored', () => {
  assert.deepEqual(planWrites(['img1'], record()), { put: [], remove: ['img1'] });
});

test('changesDraft looks at project, export options and order id only', () => {
  const base = { project: {}, exportOptions: {}, orderId: '', ui: {} };
  assert.equal(changesDraft({ ...base, ui: {} }, base), false);
  assert.equal(changesDraft({ ...base, project: {} }, base), true);
  assert.equal(changesDraft({ ...base, exportOptions: {} }, base), true);
  assert.equal(changesDraft({ ...base, orderId: 'x' }, base), true);
});

// Manual clock: timers run only when the test advances time.
function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimer(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.fn();
        }
      }
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('three touches make one save 500 ms after the last', async () => {
  const clock = fakeClock();
  let saves = 0;
  const autosave = createAutosave({ save: () => { saves += 1; }, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  autosave.touch();
  clock.advance(200);
  autosave.touch();
  clock.advance(200);
  autosave.touch();
  assert.equal(autosave.pending(), true);
  clock.advance(499);
  await settle();
  assert.equal(saves, 0);
  clock.advance(1);
  await settle();
  assert.equal(saves, 1);
  assert.equal(autosave.pending(), false);
});

test('a touch during a slow save makes exactly one more save after it', async () => {
  const clock = fakeClock();
  const finishers = [];
  const autosave = createAutosave({
    save: () => new Promise((resolve) => finishers.push(resolve)),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  autosave.touch();
  clock.advance(500);
  await settle();
  assert.equal(finishers.length, 1);
  autosave.touch();
  autosave.touch();
  clock.advance(500);
  await settle();
  assert.equal(finishers.length, 1);
  finishers[0]();
  await settle();
  clock.advance(500);
  await settle();
  assert.equal(finishers.length, 2);
  finishers[1]();
  await settle();
  clock.advance(5000);
  await settle();
  assert.equal(finishers.length, 2);
  assert.equal(autosave.pending(), false);
});

test('flush with nothing pending does not save', async () => {
  const clock = fakeClock();
  let saves = 0;
  const autosave = createAutosave({ save: () => { saves += 1; }, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  await autosave.flush();
  assert.equal(saves, 0);
});

test('flush saves at once when something is pending, and the timer does not save again', async () => {
  const clock = fakeClock();
  let saves = 0;
  const autosave = createAutosave({ save: () => { saves += 1; }, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  autosave.touch();
  await autosave.flush();
  assert.equal(saves, 1);
  clock.advance(500);
  await settle();
  assert.equal(saves, 1);
});

test('cancel during a running save marks that save cancelled, and it can fail silently', async () => {
  const clock = fakeClock();
  const reported = [];
  let finish = null;
  let seenAtStart = null;
  const autosave = createAutosave({
    save: ({ cancelled }) => {
      seenAtStart = cancelled();
      return new Promise((resolve, reject) => {
        finish = reject;
      }).catch((error) => {
        if (!cancelled()) reported.push(error.message);
      });
    },
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  autosave.touch();
  clock.advance(500);
  await settle();
  assert.equal(seenAtStart, false);
  autosave.cancel();
  finish(new Error('imagem ausente'));
  await settle();
  assert.deepEqual(reported, []);
  assert.equal(autosave.pending(), false);
});

test('a save not cancelled sees cancelled() false and reports its failure', async () => {
  const reported = [];
  const autosave = createAutosave({
    save: async ({ cancelled }) => {
      try {
        throw new Error('cota');
      } catch (error) {
        if (!cancelled()) reported.push(error.message);
      }
    },
  });
  autosave.touch();
  await autosave.flush();
  assert.deepEqual(reported, ['cota']);
});

test('a failed save leaves the autosave working', async () => {
  const clock = fakeClock();
  let saves = 0;
  const autosave = createAutosave({
    save: () => {
      saves += 1;
      throw new Error('cota');
    },
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  autosave.touch();
  await autosave.flush();
  autosave.touch();
  await autosave.flush();
  assert.equal(saves, 2);
  assert.equal(autosave.pending(), false);
});
