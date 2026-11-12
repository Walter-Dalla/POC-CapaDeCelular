// The print file: the composition rendered from millimetres straight to pixels at the chosen
// resolution on an offscreen canvas, the resolution written into the file's metadata, and the
// download. Nothing here touches the DOM until a function runs in the browser.

import { effectiveBleed, exportSize, pxPerMm } from './geometry.js';
import { drawComposition } from './render.js';
import { setJpegDpi, setPngDpi } from './png-dpi.js';
import { exportFileName } from './export-name.js';

const MAX_SIDE_PX = 8192;
const MAX_AREA_PX = 16777216;
export const LIMIT_MESSAGE = 'Arquivo grande demais para este navegador. Escolha um DPI menor.';
const JPEG_QUALITY = 0.95;

// Message when a canvas of this size is too large for common browsers, else null.
export function checkExportLimit(widthPx, heightPx) {
  if (widthPx > MAX_SIDE_PX || heightPx > MAX_SIDE_PX || widthPx * heightPx > MAX_AREA_PX) return LIMIT_MESSAGE;
  return null;
}

// Everything the export needs, computed from the state and the resolved model. JPEG has no
// transparency, so the cut is always the whole rectangle and the camera hole stays painted.
export function renderPlan(state, model) {
  const { exportOptions } = state;
  const jpeg = exportOptions.format === 'jpeg';
  const bleedMm = effectiveBleed(exportOptions, model);
  const size = exportSize(model, bleedMm, exportOptions.dpi);
  return {
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    widthPx: size.widthPx,
    heightPx: size.heightPx,
    scale: pxPerMm(exportOptions.dpi),
    bleedMm,
    clip: jpeg ? 'rect' : exportOptions.clip,
    cameraHole: jpeg ? false : exportOptions.cameraHole,
    mirror: exportOptions.mirror,
    mime: jpeg ? 'image/jpeg' : 'image/png',
    quality: jpeg ? JPEG_QUALITY : undefined,
    dpi: exportOptions.dpi,
    fileName: exportFileName({
      orderId: state.orderId,
      modelId: model.id,
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      dpi: exportOptions.dpi,
      format: exportOptions.format,
    }),
  };
}

function canvasBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('O navegador não gerou a imagem.'))),
      mime,
      quality,
    );
  });
}

// Renders the file in the browser and returns it with its name; throws Error on the size limit
// or on any failure of the canvas or of the metadata.
export async function exportFile(state, model, getBitmap) {
  const plan = renderPlan(state, model);
  const limit = checkExportLimit(plan.widthPx, plan.heightPx);
  if (limit) throw new Error(limit);

  const canvas = document.createElement('canvas');
  canvas.width = plan.widthPx;
  canvas.height = plan.heightPx;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não gerou a imagem.');
    drawComposition(context, {
      model,
      layers: state.project.layers,
      background: state.project.background,
      getBitmap,
      scale: plan.scale,
      bleedMm: plan.bleedMm,
      clip: plan.clip,
      cameraHole: plan.cameraHole,
      mirror: plan.mirror,
    });
    const rendered = await canvasBlob(canvas, plan.mime, plan.quality);
    const bytes = new Uint8Array(await rendered.arrayBuffer());
    const withDpi = plan.mime === 'image/png' ? setPngDpi(bytes, plan.dpi) : setJpegDpi(bytes, plan.dpi);
    return { blob: new Blob([withDpi], { type: plan.mime }), fileName: plan.fileName };
  } finally {
    // Frees the large bitmap right away instead of waiting for the canvas to be collected.
    canvas.width = 0;
    canvas.height = 0;
  }
}

// Saves the blob under the given name through a temporary link to an object URL.
export function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
