// Drawing routine shared by the stage, the export preview and the exported
// file. It reads nothing from the DOM: the caller passes the context, the
// layers, a bitmap lookup and the scale in pixels per millimetre.

import { layerSize, traceCase, traceCutouts } from './geometry.js';

const FULL_CROP = { x: 0, y: 0, width: 1, height: 1 };
// Any opaque fill works for erasing: destination-out only uses its alpha.
const ERASE_FILL = '#000';

// Draws the layers bottom first, each centred on its (cx, cy) in mm from the
// current origin and rotated clockwise. Layers without a bitmap are skipped.
export function drawLayers(ctx, layers, getBitmap, scale) {
  for (const layer of layers) {
    const bitmap = getBitmap(layer.imageId);
    if (!bitmap) continue;
    const crop = layer.crop ?? FULL_CROP;
    const sx = crop.x * layer.naturalWidth;
    const sy = crop.y * layer.naturalHeight;
    const sw = crop.width * layer.naturalWidth;
    const sh = crop.height * layer.naturalHeight;
    const { width: w, height: h } = layerSize(layer);
    ctx.save();
    ctx.translate(layer.cx * scale, layer.cy * scale);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.drawImage(bitmap, sx, sy, sw, sh, (-w / 2) * scale, (-h / 2) * scale, w * scale, h * scale);
    ctx.restore();
  }
}

// Draws the whole cover on a context whose origin is the top-left corner of a
// canvas of (case + 2 × bleed) × scale: optional horizontal mirror, optional
// clip to the case contour, background, layers, optional camera hole.
export function drawComposition(
  ctx,
  { model, layers, background, getBitmap, scale, bleedMm, clip, cameraHole, mirror },
) {
  const width = (model.case.width + 2 * bleedMm) * scale;
  const height = (model.case.height + 2 * bleedMm) * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.translate(width / 2, height / 2);
  if (clip === 'contour') {
    ctx.beginPath();
    traceCase(ctx, model, bleedMm, scale);
    ctx.clip();
  }
  ctx.fillStyle = background;
  ctx.fillRect(-width / 2, -height / 2, width, height);
  drawLayers(ctx, layers, getBitmap, scale);
  if (cameraHole) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = ERASE_FILL;
    ctx.beginPath();
    traceCutouts(ctx, model, scale);
    ctx.fill();
  }
  ctx.restore();
}
