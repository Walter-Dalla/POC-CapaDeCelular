// Pointer input on the stage: it turns pointer events into changes of the
// project through js/layers.js and into `ui` changes, and closes one undo step
// per gesture (on release, never per event). Points are in mm from the centre
// of the cover; screen pixels only set the size of the touch targets.

import { layerRect, pointInRotatedRect, rectCorners, selectionHandles, snapToZero, toLocal } from './geometry.js';
import {
  clampCrop,
  getLayer,
  layerBounds,
  lowerLayer,
  moveLayer,
  moveLayerBy,
  normalizeRotation,
  raiseLayer,
  removeLayer,
  scaleLayer,
  setCrop,
  setLayerWidth,
  setRotation,
  snapRotation,
} from './layers.js';
import { cropFrame, cropRectOnCover, stageView } from './stage.js';

// Distance in screen px from a handle's centre that still hits it (44 px target).
const HANDLE_HIT_PX = 22;
// Distance in mm from the centre of the cover under which a dragged centre snaps to it.
const SNAP_MM = 1.5;
const HANDLE_PARTS = ['rotate', 'nw', 'ne', 'se', 'sw'];
const NO_GUIDES = Object.freeze({ v: false, h: false });
// Cursor class of the stage canvas for each part under the mouse.
const CURSORS = { body: 'move', rotate: 'grab', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' };
const CURSOR_CLASSES = ['move', 'grab', 'grabbing', 'nwse', 'nesw'].map((name) => `stage-canvas--${name}`);

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// What the point hits: a handle of the selected layer ('rotate', 'nw', 'ne',
// 'se', 'sw'), else the body of the topmost layer containing it, else null.
export function hitTest(layers, point, pxPerMm, selectedId) {
  const selected = layers.find((layer) => layer.id === selectedId);
  if (selected) {
    const handles = selectionHandles(layerRect(selected), pxPerMm);
    const radius = HANDLE_HIT_PX / pxPerMm;
    for (const part of HANDLE_PARTS) {
      if (distance(handles[part], point) <= radius) return { layerId: selected.id, part };
    }
  }
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    if (pointInRotatedRect(point.x, point.y, layerRect(layer))) return { layerId: layer.id, part: 'body' };
  }
  return null;
}

// New centre of a dragged layer: the centre at grab time (cx, cy) moved by the
// pointer's travel since the grab point (x, y), so the grabbed point stays
// under the pointer; an axis within 1.5 mm of 0 snaps to 0 and lights its guide.
export function dragMove(start, pointer) {
  const cx = snapToZero(start.cx + pointer.x - start.x, SNAP_MM);
  const cy = snapToZero(start.cy + pointer.y - start.y, SNAP_MM);
  return { cx, cy, guides: { v: cx === 0, h: cy === 0 } };
}

function degrees(radians) {
  return (radians * 180) / Math.PI;
}

// Direction in degrees, clockwise on screen, of the vector from a to b.
function angleOf(a, b) {
  return degrees(Math.atan2(b.y - a.y, b.x - a.x));
}

// New width of a layer scaled by a corner handle: the start width times the
// pointer's distance from the centre over the grab point's distance from it.
// The centre stays and the proportion is kept by the layer's own aspect.
export function scaleFromHandle(start, pointer) {
  const centre = { x: start.cx, y: start.cy };
  const grabbed = distance(centre, start);
  if (grabbed === 0) return start.width;
  return (start.width * distance(centre, pointer)) / grabbed;
}

// New rotation of a layer turned by the rotate handle: the start rotation plus
// the angle the pointer swept around the centre since the grab point; with
// snap, rounded to the nearest 15°.
export function rotateFromHandle(start, pointer, snap) {
  const centre = { x: start.cx, y: start.cy };
  const rotation = normalizeRotation(start.rotation + angleOf(centre, pointer) - angleOf(centre, start));
  return snap ? snapRotation(rotation, 15) : rotation;
}

const WHEEL_RATE = 0.0015;
const WHEEL_MIN = 0.8;
const WHEEL_MAX = 1.25;

// Scale factor of one wheel event: up (negative deltaY) grows, down shrinks,
// limited to 0.8–1.25 per event.
export function wheelFactor(deltaY) {
  return Math.min(WHEEL_MAX, Math.max(WHEEL_MIN, Math.exp(-deltaY * WHEEL_RATE)));
}

// Two-finger pinch from the pointers at the start (start.a, start.b) to the
// pointers now (a, b): the factor between their distances and the turn of the
// line through them, in degrees within (−180, 180].
export function pinchStep(start, a, b) {
  const before = distance(start.a, start.b);
  return {
    factor: before === 0 ? 1 : distance(a, b) / before,
    rotation: normalizeRotation(angleOf(a, b) - angleOf(start.a, start.b)),
  };
}

const ARROW_STEP_MM = 1;
const ARROW_FINE_STEP_MM = 0.1;
const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const KEY_ACTIONS = {
  Delete: 'remove',
  Backspace: 'remove',
  ']': 'raise',
  '[': 'lower',
  Escape: 'cancel',
  Enter: 'confirm',
};

// Action of a key pressed on the stage, or null: keys typed in a text field
// and shortcuts with Ctrl or Meta belong to someone else. Arrows move by 1 mm,
// by 0.1 mm with Shift.
export function keyAction({ key, shiftKey, ctrlKey, metaKey, targetIsText }) {
  if (targetIsText || ctrlKey || metaKey) return null;
  const arrow = ARROWS[key];
  if (arrow) {
    const step = shiftKey ? ARROW_FINE_STEP_MM : ARROW_STEP_MM;
    return { type: 'move', dx: arrow[0] * step, dy: arrow[1] * step };
  }
  const type = KEY_ACTIONS[key];
  return type ? { type } : null;
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

function isTextTarget(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return true;
  return element.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(element.type);
}

const FULL_CROP = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const MIN_CROP_SIDE = 0.05;
const CROP_CORNERS = ['nw', 'ne', 'se', 'sw'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// What a point hits on the crop draft of a layer: a corner ('nw', 'ne', 'se',
// 'sw', within 22 screen px), the inside of the draft, or null.
export function cropHit(layer, draft, point, pxPerMm) {
  const rect = cropRectOnCover(layer, draft);
  const corners = rectCorners(rect);
  const radius = HANDLE_HIT_PX / pxPerMm;
  for (let index = 0; index < CROP_CORNERS.length; index += 1) {
    if (distance(corners[index], point) <= radius) return CROP_CORNERS[index];
  }
  return pointInRotatedRect(point.x, point.y, rect) ? 'inside' : null;
}

// Crop draft dragged by (dx, dy) in fractions of the whole image: a corner
// moves that corner with the opposite one fixed, each side kept at least 0.05
// and inside the image; 'inside' moves the rectangle, stopping at the edges
// without changing its size.
export function cropDrag(startDraft, part, dx, dy) {
  const { x, y, width, height } = startDraft;
  if (part === 'inside') {
    return clampCrop({ x: clamp(x + dx, 0, 1 - width), y: clamp(y + dy, 0, 1 - height), width, height });
  }
  if (!CROP_CORNERS.includes(part)) return startDraft;
  let left = x;
  let top = y;
  let right = x + width;
  let bottom = y + height;
  if (part.includes('w')) left = clamp(left + dx, 0, right - MIN_CROP_SIDE);
  if (part.includes('e')) right = clamp(right + dx, left + MIN_CROP_SIDE, 1);
  if (part.includes('n')) top = clamp(top + dy, 0, bottom - MIN_CROP_SIDE);
  if (part.includes('s')) bottom = clamp(bottom + dy, top + MIN_CROP_SIDE, 1);
  return clampCrop({ x: left, y: top, width: right - left, height: bottom - top });
}

// Pointer travel in mm on the cover turned into fractions of the layer's whole
// image: un-rotated by the layer's rotation, divided by the size of its frame.
function cropDelta(layer, dxMm, dyMm) {
  const frame = cropFrame(layer);
  const local = toLocal(dxMm, dyMm, { cx: 0, cy: 0, rotation: layer.rotation });
  return { x: local.x / frame.width, y: local.y / frame.height };
}

// Wires the pointer on the stage canvas. Does nothing without the state or the stage.
export function mountGestures(ctx) {
  if (!ctx.state || !ctx.stage) return;
  const canvas = document.getElementById('stage-canvas');
  const stage = document.getElementById('stage');
  const { state } = ctx;
  // Active pointers on the canvas, by pointer id, in mm.
  const pointers = new Map();
  let gesture = null;

  const bounds = () => {
    const model = ctx.model();
    return layerBounds(model, model.bleed);
  };

  // Cursor of the canvas: one of the CURSORS values, or null for the default.
  function setCursor(name) {
    for (const className of CURSOR_CLASSES) {
      canvas.classList.toggle(className, className === `stage-canvas--${name}`);
    }
  }

  // The layer in crop mode, or null.
  function cropLayer() {
    const { project, ui } = state.getState();
    return ui.cropLayerId ? getLayer(project, ui.cropLayerId) : null;
  }

  function draftOf(layer) {
    return state.getState().ui.cropDraft ?? layer.crop ?? FULL_CROP;
  }

  function cancelCrop() {
    state.setUi({ cropLayerId: null, cropDraft: null });
  }

  // Applies the draft to the layer as one undo step and leaves crop mode.
  function applyCrop() {
    const layer = cropLayer();
    if (layer) {
      const draft = draftOf(layer);
      state.updateProject((project) => setCrop(project, layer.id, draft));
      state.commit();
    }
    cancelCrop();
  }

  // Cursor for what lies under a mouse that is not dragging.
  function hover(point) {
    const current = state.getState();
    const scale = ctx.stage.pxPerMm();
    if (stageView(current) !== 'edit' || !(scale > 0)) {
      setCursor(null);
      return;
    }
    const cropping = cropLayer();
    if (cropping) {
      const part = cropHit(cropping, draftOf(cropping), point, scale);
      setCursor(part === 'inside' ? 'move' : part ? CURSORS[part] : null);
      return;
    }
    const hit = hitTest(current.project.layers, point, scale, current.ui.selectedLayerId);
    setCursor(hit ? CURSORS[hit.part] : null);
  }

  // In crop mode the pointer moves a corner or the whole of the draft.
  function startCropGesture(layer, point, pointerId) {
    const scale = ctx.stage.pxPerMm();
    if (!(scale > 0)) return;
    const draft = draftOf(layer);
    const part = cropHit(layer, draft, point, scale);
    if (!part) return;
    gesture = { kind: 'crop', pointerId, layerId: layer.id, start: { draft, part, x: point.x, y: point.y }, moved: false };
    setCursor(part === 'inside' ? 'grabbing' : CURSORS[part]);
  }

  // Applies a project change and remembers that the gesture changed something.
  function change(fn) {
    const before = state.getState().project;
    state.updateProject(fn);
    if (state.getState().project !== before) gesture.moved = true;
  }

  function startLayerGesture(point, pointerId) {
    const { project, ui } = state.getState();
    const scale = ctx.stage.pxPerMm();
    if (!(scale > 0)) return;
    const hit = hitTest(project.layers, point, scale, ui.selectedLayerId);
    if (!hit) {
      state.setUi({ selectedLayerId: null });
      return;
    }
    state.setUi({ selectedLayerId: hit.layerId });
    const layer = getLayer(project, hit.layerId);
    const start = {
      cx: layer.cx,
      cy: layer.cy,
      width: layer.width,
      rotation: layer.rotation,
      x: point.x,
      y: point.y,
    };
    const kind = hit.part === 'body' ? 'drag' : hit.part === 'rotate' ? 'rotate' : 'scale';
    gesture = { kind, pointerId, layerId: layer.id, start, moved: false };
    setCursor(kind === 'scale' ? CURSORS[hit.part] : 'grabbing');
  }

  function moveGesture(event, point) {
    const { kind, layerId, start } = gesture;
    if (kind === 'drag') {
      const next = dragMove(start, point);
      change((project) => moveLayer(project, layerId, next.cx, next.cy, bounds()));
      state.setUi({ guides: next.guides });
    } else if (kind === 'scale') {
      change((project) => setLayerWidth(project, layerId, scaleFromHandle(start, point)));
    } else if (kind === 'rotate') {
      change((project) => setRotation(project, layerId, rotateFromHandle(start, point, event.shiftKey)));
    } else if (kind === 'crop') {
      const layer = cropLayer();
      if (!layer || layer.id !== layerId) return;
      const delta = cropDelta(layer, point.x - start.x, point.y - start.y);
      state.setUi({ cropDraft: cropDrag(start.draft, start.part, delta.x, delta.y) });
    } else if (kind === 'pinch') {
      const step = pinchStep(start, pointers.get(gesture.pointerIds[0]), pointers.get(gesture.pointerIds[1]));
      change((project) =>
        setRotation(
          setLayerWidth(project, layerId, start.width * step.factor),
          layerId,
          start.rotation + step.rotation,
        ),
      );
    }
  }

  // The selected layer, or null.
  function selectedLayer() {
    const { project, ui } = state.getState();
    return getLayer(project, ui.selectedLayerId);
  }

  // A second finger turns the gesture into a pinch on the selected layer,
  // keeping what the first finger already changed in the same undo step.
  function startPinch() {
    const layer = selectedLayer();
    const moved = gesture?.moved ?? false;
    state.setUi({ guides: NO_GUIDES });
    gesture = null;
    if (!layer) {
      if (moved) state.commit();
      return;
    }
    const pointerIds = [...pointers.keys()];
    gesture = {
      kind: 'pinch',
      pointerIds,
      layerId: layer.id,
      start: {
        a: pointers.get(pointerIds[0]),
        b: pointers.get(pointerIds[1]),
        width: layer.width,
        rotation: layer.rotation,
      },
      moved,
    };
  }

  // Whether the pointer drives the current gesture.
  function drives(pointerId) {
    if (!gesture) return false;
    return gesture.kind === 'pinch' ? gesture.pointerIds.includes(pointerId) : gesture.pointerId === pointerId;
  }

  function endGesture() {
    const ended = gesture;
    gesture = null;
    state.setUi({ guides: NO_GUIDES });
    if (ended.moved) state.commit();
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (stageView(state.getState()) !== 'edit') return;
    const point = ctx.stage.toMm(event.clientX, event.clientY);
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point);
    const cropping = cropLayer();
    if (cropping) {
      if (pointers.size === 1 && !gesture) startCropGesture(cropping, point, event.pointerId);
    } else if (pointers.size === 1 && !gesture) startLayerGesture(point, event.pointerId);
    else if (pointers.size === 2) startPinch();
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = ctx.stage.toMm(event.clientX, event.clientY);
    if (!pointers.has(event.pointerId)) {
      if (event.pointerType === 'mouse') hover(point);
      return;
    }
    pointers.set(event.pointerId, point);
    if (drives(event.pointerId)) moveGesture(event, point);
  });

  function release(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (drives(event.pointerId)) endGesture();
    if (event.pointerType === 'mouse') hover(ctx.stage.toMm(event.clientX, event.clientY));
    else setCursor(null);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // The wheel scales the selected layer; a burst of wheel events is one undo step.
  canvas.addEventListener(
    'wheel',
    (event) => {
      const current = state.getState();
      if (stageView(current) !== 'edit' || current.ui.cropLayerId) return;
      const layer = selectedLayer();
      if (!layer) return;
      event.preventDefault();
      state.updateProject((project) => scaleLayer(project, layer.id, wheelFactor(event.deltaY)));
      state.commit('wheel');
    },
    { passive: false },
  );

  // Applies a key action to the selected layer, or in crop mode to the crop;
  // returns whether it was used.
  function applyKey(action) {
    const current = state.getState();
    if (stageView(current) !== 'edit') return false;
    if (cropLayer()) {
      if (action.type === 'cancel') cancelCrop();
      else if (action.type === 'confirm') applyCrop();
      else return false;
      return true;
    }
    const layer = selectedLayer();
    switch (action.type) {
      case 'cancel':
        if (current.ui.selectedLayerId === null) return false;
        state.setUi({ selectedLayerId: null });
        return true;
      case 'move':
        if (!layer) return false;
        state.updateProject((project) => moveLayerBy(project, layer.id, action.dx, action.dy, bounds()));
        state.commit('arrows');
        return true;
      case 'remove':
        if (!layer) return false;
        state.updateProject((project) => removeLayer(project, layer.id));
        state.commit();
        state.setUi({ selectedLayerId: null });
        return true;
      case 'raise':
      case 'lower':
        if (!layer) return false;
        state.updateProject((project) => (action.type === 'raise' ? raiseLayer : lowerLayer)(project, layer.id));
        state.commit();
        return true;
      default:
        return false;
    }
  }

  stage.addEventListener('keydown', (event) => {
    // Enter on a button inside the stage presses that button.
    if (event.key === 'Enter' && event.target.closest?.('button, a')) return;
    const action = keyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      targetIsText: isTextTarget(event.target),
    });
    if (action && applyKey(action)) event.preventDefault();
  });

  document.getElementById('btn-crop-apply').addEventListener('click', applyCrop);
  document.getElementById('btn-crop-cancel').addEventListener('click', cancelCrop);
  document.getElementById('btn-crop-reset').addEventListener('click', () => {
    if (cropLayer()) state.setUi({ cropDraft: { ...FULL_CROP } });
  });

  // Crop mode follows the state: entering it selects the layer and starts the
  // draft from its crop; a draft dropped by undo starts again from the crop;
  // leaving the Imagens tab, removing the layer or selecting another one
  // cancels it.
  state.subscribe((next, prev) => {
    const id = next.ui.cropLayerId;
    if (!id) return;
    const layer = getLayer(next.project, id);
    const leftTab = prev.ui.tab === 'images' && next.ui.tab !== 'images';
    if (!layer || leftTab) {
      cancelCrop();
      return;
    }
    if (id !== prev.ui.cropLayerId) {
      state.setUi({ selectedLayerId: id, cropDraft: next.ui.cropDraft ?? layer.crop ?? { ...FULL_CROP } });
      return;
    }
    if (next.ui.selectedLayerId !== prev.ui.selectedLayerId && next.ui.selectedLayerId !== id) {
      cancelCrop();
      return;
    }
    if (next.ui.cropDraft === null) state.setUi({ cropDraft: layer.crop ?? { ...FULL_CROP } });
  });
}
