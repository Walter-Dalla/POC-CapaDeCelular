// Pure geometry of the cover: every length is in millimetres, layer
// coordinates start at the centre of the cover, pixels appear only here when
// converting for a given resolution.

const MM_PER_INCH = 25.4;
const METERS_PER_INCH = 0.0254;
const FULL_CROP = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });

// Pixels per millimetre at a resolution given in dots per inch.
export function pxPerMm(dpi) {
  return dpi / MM_PER_INCH;
}

// Millimetres to whole pixels at the given resolution.
export function mmToPx(mm, dpi) {
  return Math.round(mm * pxPerMm(dpi));
}

// Pixels per metre, the unit of the PNG pHYs chunk, rounded.
export function pxPerMeter(dpi) {
  return Math.round(dpi / METERS_PER_INCH);
}

// Size of the exported file: the case plus the bleed on every side.
export function exportSize(model, bleedMm, dpi) {
  const widthMm = model.case.width + 2 * bleedMm;
  const heightMm = model.case.height + 2 * bleedMm;
  return {
    widthMm,
    heightMm,
    widthPx: mmToPx(widthMm, dpi),
    heightPx: mmToPx(heightMm, dpi),
  };
}

// Bleed in millimetres that the export uses: none when turned off, else the
// chosen value or, when none was chosen, the model's own bleed.
export function effectiveBleed(exportOptions, model) {
  if (!exportOptions.bleedOn) return 0;
  return exportOptions.bleedMm ?? model.bleed;
}

// Size in millimetres of the visible (cropped) part of a layer; the height
// follows the aspect ratio of the cropped area of the original image.
export function layerSize(layer) {
  const crop = layer.crop ?? FULL_CROP;
  const width = layer.width;
  const height =
    (width * (crop.height * layer.naturalHeight)) / (crop.width * layer.naturalWidth);
  return { width, height };
}

// Rotated rectangle of a layer: centre, size and rotation in degrees.
export function layerRect(layer) {
  const { width, height } = layerSize(layer);
  return { cx: layer.cx, cy: layer.cy, width, height, rotation: layer.rotation };
}

// Adds a rounded rectangle with its top-left corner at (x, y) to the current
// path; the radius is clamped to half the shorter side.
export function traceRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// Adds the case contour, grown by growMm on every side (corner radius grown by
// the same amount), centred on the origin, in units of mm × scale.
export function traceCase(ctx, model, growMm, scale) {
  const w = (model.case.width + 2 * growMm) * scale;
  const h = (model.case.height + 2 * growMm) * scale;
  const r = (model.case.cornerRadius + growMm) * scale;
  traceRoundRect(ctx, -w / 2, -h / 2, w, h, r);
}

// Adds every camera cutout of the model to the current path. Catalog cutouts
// are measured from the top-left corner of the case; here they are moved to
// the centre origin and multiplied by scale.
export function traceCutouts(ctx, model, scale) {
  const ox = -model.case.width / 2;
  const oy = -model.case.height / 2;
  for (const cutout of model.cutouts ?? []) {
    if (cutout.shape === 'circle') {
      const cx = (ox + cutout.cx) * scale;
      const cy = (oy + cutout.cy) * scale;
      const r = cutout.r * scale;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.closePath();
    } else if (cutout.shape === 'roundRect') {
      traceRoundRect(
        ctx,
        (ox + cutout.x) * scale,
        (oy + cutout.y) * scale,
        cutout.width * scale,
        cutout.height * scale,
        (cutout.radius ?? 0) * scale,
      );
    }
  }
}

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Point (x, y) expressed in the rectangle's unrotated frame, origin at its
// centre. Rotation is clockwise on screen (y grows downwards).
export function toLocal(x, y, rect) {
  const a = radians(rect.rotation);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = x - rect.cx;
  const dy = y - rect.cy;
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

function toWorld(lx, ly, rect) {
  const a = radians(rect.rotation);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: rect.cx + lx * cos - ly * sin, y: rect.cy + lx * sin + ly * cos };
}

// Whether the point lies inside the rotated rectangle (edges included).
export function pointInRotatedRect(x, y, rect) {
  const local = toLocal(x, y, rect);
  return Math.abs(local.x) <= rect.width / 2 && Math.abs(local.y) <= rect.height / 2;
}

// Corners of the rotated rectangle: [nw, ne, se, sw] of its unrotated frame.
export function rectCorners(rect) {
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  return [
    toWorld(-hw, -hh, rect),
    toWorld(hw, -hh, rect),
    toWorld(hw, hh, rect),
    toWorld(-hw, hh, rect),
  ];
}

const ROTATE_HANDLE_OFFSET_PX = 50;

// Selection handles in mm: the four corners and the rotation handle, which
// sits 50 screen pixels above the middle of the top edge. screenPxPerMm is the
// zoom of the stage.
export function selectionHandles(rect, screenPxPerMm) {
  const [nw, ne, se, sw] = rectCorners(rect);
  const rotate = toWorld(0, -rect.height / 2 - ROTATE_HANDLE_OFFSET_PX / screenPxPerMm, rect);
  return { nw, ne, se, sw, rotate };
}

// 0 when the value is within the threshold of zero, else the value.
export function snapToZero(value, thresholdMm) {
  return Math.abs(value) <= thresholdMm ? 0 : value;
}
