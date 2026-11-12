// pt-BR formatting of the values shown in the interface and parsing of the
// millimetre fields typed by the user.

const MINUS = '−';
const TIMES = '×';

// Millimetres with one fixed decimal and a decimal comma: 147 -> '147,0'.
export function formatMm(n) {
  const fixed = n.toFixed(1);
  const text = Number(fixed) === 0 ? '0.0' : fixed;
  return text.replace('.', ',');
}

// Width and height of a case: '71,6 × 147,6 mm'.
export function formatSize(w, h) {
  return `${formatMm(w)} ${TIMES} ${formatMm(h)} mm`;
}

const MM_TEXT = /^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*(?:mm)?$/i;

// Number typed in a millimetre field; accepts a comma or a dot as decimal
// separator and an optional 'mm' suffix. Returns null when the text is not a
// finite number. The range is the caller's to validate.
export function parseMm(text) {
  if (typeof text !== 'string') return null;
  const match = MM_TEXT.exec(text.trim());
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

// Count followed by the singular or plural word: '1 imagem', '2 imagens'.
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// Whole degrees with the typographic minus sign: '−8°'.
export function formatDegrees(n) {
  const rounded = Math.round(n);
  if (rounded < 0) return `${MINUS}${-rounded}°`;
  return `${rounded === 0 ? 0 : rounded}°`;
}

// Effective resolution of the image on the cover: '222 DPI na capa'.
export function formatDpi(n) {
  return `${Math.round(n)} DPI na capa`;
}

// Size in pixels of the exported file: '893 × 1791 px'.
export function formatPx(w, h) {
  return `${Math.round(w)} ${TIMES} ${Math.round(h)} px`;
}
