// Phone case catalog: entry validation, queries and loading of ./data/models.json.
// Every measure is in millimetres, back view, cutouts measured from the top-left corner of the case.

const MAX_CASE_SIDE = 500;
const MAX_BLEED = 10;
const MAX_SAFE_MARGIN = 20;
const ID_PATTERN = /^[a-z0-9-]+$/;

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function checkRange(errors, label, value, min, max) {
  if (!isNumber(value)) {
    errors.push(`${label}: deve ser um número`);
  } else if (value < min || value > max) {
    errors.push(`${label}: deve estar entre ${min} e ${max}`);
  }
}

function checkCutout(errors, label, cutout, width, height) {
  if (!isObject(cutout)) {
    errors.push(`${label}: deve ser um objeto`);
    return;
  }
  if (cutout.shape === 'roundRect') {
    const { x, y, width: w, height: h, radius } = cutout;
    const numbers = [x, y, w, h, radius];
    if (!numbers.every(isNumber)) {
      errors.push(`${label}: x, y, width, height e radius devem ser números`);
      return;
    }
    if (w <= 0 || h <= 0) errors.push(`${label}: largura e altura devem ser maiores que zero`);
    if (radius < 0 || radius > Math.min(w, h) / 2) {
      errors.push(`${label}: radius deve estar entre 0 e a metade do lado menor`);
    }
    if (x < 0 || y < 0 || x + w > width || y + h > height) {
      errors.push(`${label}: deve ficar inteiro dentro da capa`);
    }
  } else if (cutout.shape === 'circle') {
    const { cx, cy, r } = cutout;
    if (![cx, cy, r].every(isNumber)) {
      errors.push(`${label}: cx, cy e r devem ser números`);
      return;
    }
    if (r <= 0) errors.push(`${label}: r deve ser maior que zero`);
    if (cx - r < 0 || cy - r < 0 || cx + r > width || cy + r > height) {
      errors.push(`${label}: deve ficar inteiro dentro da capa`);
    }
  } else {
    errors.push(`${label}: formato desconhecido`);
  }
}

export function validateModel(entry) {
  if (!isObject(entry)) return ['modelo: deve ser um objeto'];
  const errors = [];
  const prefix = isText(entry.id) ? `${entry.id}: ` : '';

  if (!isText(entry.id)) {
    errors.push('id: deve ser um texto não vazio');
  } else if (!ID_PATTERN.test(entry.id)) {
    errors.push(`${prefix}id: só letras minúsculas, dígitos e hífen`);
  }
  if (!isText(entry.brand)) errors.push(`${prefix}brand: deve ser um texto não vazio`);
  if (!isText(entry.name)) errors.push(`${prefix}name: deve ser um texto não vazio`);

  const box = entry.case;
  let sidesValid = false;
  if (!isObject(box)) {
    errors.push(`${prefix}case: deve ser um objeto`);
  } else {
    for (const side of ['width', 'height']) {
      const value = box[side];
      if (!isNumber(value) || value <= 0 || value > MAX_CASE_SIDE) {
        errors.push(`${prefix}case.${side}: deve ser um número maior que 0 e até ${MAX_CASE_SIDE}`);
      }
    }
    sidesValid = [box.width, box.height].every((v) => isNumber(v) && v > 0 && v <= MAX_CASE_SIDE);
    const halfShorter = sidesValid ? Math.min(box.width, box.height) / 2 : Infinity;
    if (!isNumber(box.cornerRadius) || box.cornerRadius < 0 || box.cornerRadius > halfShorter) {
      errors.push(`${prefix}case.cornerRadius: deve estar entre 0 e a metade do lado menor`);
    }
  }

  checkRange(errors, `${prefix}bleed`, entry.bleed, 0, MAX_BLEED);
  if (entry.safeMargin !== undefined) {
    checkRange(errors, `${prefix}safeMargin`, entry.safeMargin, 0, MAX_SAFE_MARGIN);
  }
  if (typeof entry.verified !== 'boolean') errors.push(`${prefix}verified: deve ser booleano`);

  if (!Array.isArray(entry.cutouts)) {
    errors.push(`${prefix}cutouts: deve ser uma lista`);
  } else if (sidesValid) {
    entry.cutouts.forEach((cutout, index) => {
      checkCutout(errors, `${prefix}cutouts[${index}]`, cutout, box.width, box.height);
    });
  }

  return errors;
}

export function validateCatalog(list) {
  if (!Array.isArray(list)) return ['catálogo: deve ser uma lista'];
  const errors = [];
  const seen = new Set();
  list.forEach((entry, index) => {
    for (const error of validateModel(entry)) errors.push(`[${index}] ${error}`);
    const id = isObject(entry) ? entry.id : undefined;
    if (isText(id)) {
      if (seen.has(id)) errors.push(`[${index}] ${id}: id repetido`);
      seen.add(id);
    }
  });
  return errors;
}
