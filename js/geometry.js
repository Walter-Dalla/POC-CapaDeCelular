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
