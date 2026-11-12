// Print-resolution metadata of exported images: the PNG pHYs chunk and the JPEG JFIF APP0 density.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const INCH_IN_METRES = 0.0254;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const readUint32 = (bytes, at) =>
  ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;

function writeUint32(bytes, at, value) {
  bytes[at] = (value >>> 24) & 0xff;
  bytes[at + 1] = (value >>> 16) & 0xff;
  bytes[at + 2] = (value >>> 8) & 0xff;
  bytes[at + 3] = value & 0xff;
}

const chunkType = (bytes, at) => String.fromCharCode(...bytes.subarray(at + 4, at + 8));

// Splits a PNG into its chunks ({ type, start, end, dataStart, length }); throws on a broken file.
function pngChunks(bytes) {
  const invalid = () => new Error('PNG inválido');
  if (!(bytes instanceof Uint8Array) || bytes.length < PNG_SIGNATURE.length) throw invalid();
  if (!PNG_SIGNATURE.every((value, i) => bytes[i] === value)) throw invalid();
  const chunks = [];
  let at = PNG_SIGNATURE.length;
  while (at < bytes.length) {
    if (at + 12 > bytes.length) throw invalid();
    const length = readUint32(bytes, at);
    const end = at + 12 + length;
    if (end > bytes.length) throw invalid();
    const type = chunkType(bytes, at);
    chunks.push({ type, start: at, end, dataStart: at + 8, length });
    at = end;
    if (type === 'IEND') break;
  }
  if (chunks.length === 0 || chunks[0].type !== 'IHDR') throw invalid();
  if (chunks[chunks.length - 1].type !== 'IEND') throw invalid();
  return chunks;
}

function physChunk(dpi) {
  const perMetre = Math.round(dpi / INCH_IN_METRES);
  const chunk = new Uint8Array(12 + 9);
  writeUint32(chunk, 0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  writeUint32(chunk, 8, perMetre);
  writeUint32(chunk, 12, perMetre);
  chunk[16] = 1;
  writeUint32(chunk, 17, crc32(chunk.subarray(4, 17)));
  return chunk;
}

export function setPngDpi(bytes, dpi) {
  const chunks = pngChunks(bytes);
  const kept = chunks.filter((chunk) => chunk.type !== 'pHYs');
  const phys = physChunk(dpi);
  const parts = [bytes.subarray(0, PNG_SIGNATURE.length)];
  kept.forEach((chunk, index) => {
    parts.push(bytes.subarray(chunk.start, chunk.end));
    if (index === 0) parts.push(phys);
  });
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function readPngDpi(bytes) {
  const phys = pngChunks(bytes).find((chunk) => chunk.type === 'pHYs');
  if (!phys || phys.length < 9 || bytes[phys.dataStart + 8] !== 1) return null;
  return Math.round(readUint32(bytes, phys.dataStart) * INCH_IN_METRES);
}
