// Pointer input on the stage: it turns pointer events into changes of the
// project through js/layers.js and into `ui` changes, and closes one undo step
// per gesture (on release, never per event). Points are in mm from the centre
// of the cover; screen pixels only set the size of the touch targets.

import { layerRect, pointInRotatedRect, selectionHandles, snapToZero } from './geometry.js';
import {
  getLayer,
  layerBounds,
  moveLayer,
  normalizeRotation,
  scaleLayer,
  setLayerWidth,
  setRotation,
  snapRotation,
} from './layers.js';
import { stageView } from './stage.js';

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

// Wires the pointer on the stage canvas. Does nothing without the state or the stage.
export function mountGestures(ctx) {
  if (!ctx.state || !ctx.stage) return;
  const canvas = document.getElementById('stage-canvas');
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

  // Cursor for what lies under a mouse that is not dragging.
  function hover(point) {
    const current = state.getState();
    const scale = ctx.stage.pxPerMm();
    if (stageView(current) !== 'edit' || !(scale > 0)) {
      setCursor(null);
      return;
    }
    const hit = hitTest(current.project.layers, point, scale, current.ui.selectedLayerId);
    setCursor(hit ? CURSORS[hit.part] : null);
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
    if (pointers.size === 1 && !gesture) startLayerGesture(point, event.pointerId);
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
}
