// File name of the exported print image: [<order>-]capa-<model>-<w>x<h>mm-<dpi>dpi.<ext>.

const MAX_ORDER_CHARS = 40;
const EXTENSIONS = { png: 'png', jpeg: 'jpg', jpg: 'jpg' };

export function normalizeOrderId(text) {
  return Array.from(String(text ?? ''))
    .slice(0, MAX_ORDER_CHARS)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const formatMm = (value) => String(Math.round(value * 10) / 10);

export function exportFileName({ orderId, modelId, widthMm, heightMm, dpi, format }) {
  const ext = EXTENSIONS[format];
  if (!ext) throw new Error(`Formato desconhecido: ${format}`);
  const order = normalizeOrderId(orderId);
  const model = modelId === 'custom' ? 'personalizado' : modelId;
  const name = `capa-${model}-${formatMm(widthMm)}x${formatMm(heightMm)}mm-${Math.round(dpi)}dpi.${ext}`;
  return order ? `${order}-${name}` : name;
}
